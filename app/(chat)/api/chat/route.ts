import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ✅ getEntitlements байхгүй тул зөвхөн mapping-оо авна
import { entitlementsByUserType } from "@/lib/ai/entitlements";

import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error?.message?.includes("REDIS_URL")) {
        console.log(" > Resumable streams are disabled due to missing REDIS_URL");
      } else {
        console.error(error);
      }
    }
  }
  return globalStreamContext;
}

// ✅ UserType-г mapping-оосоо гаргаж авна (төрөл нэмэгдсэн ч автоматаар дагана)
type UserType = keyof typeof entitlementsByUserType;

type AppSession = {
  user: {
    id: string; // guest эсвэл supabase user id
    type: UserType;
  };
};

// ✅ entitlements helper (getEntitlements байхгүйг нөхнө)
function getEntitlementsSafe(userType: UserType) {
  // mapping байхгүй бол fallback
  return entitlementsByUserType[userType] ?? { maxMessagesPerDay: 20 };
}

async function getAppSession(): Promise<AppSession> {
  // ⚠️ createSupabaseServerClient() дээр await авахгүй!
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    return {
      user: {
        id: "guest",
        type: "guest" as UserType,
      },
    };
  }

  // metadata дээр type байвал хэрэглэнэ, байхгүй бол regular
  const rawType = (user.user_metadata as any)?.type as string | undefined;
  const fallbackType = "regular" as UserType;

  const resolvedType: UserType =
    rawType && rawType in entitlementsByUserType
      ? (rawType as UserType)
      : fallbackType;

  return {
    user: {
      id: user.id,
      type: resolvedType,
    },
  };
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await getAppSession();

    // ✅ Rate limit (guest үед DB query алгасна)
    const userType = session.user.type;
    const { maxMessagesPerDay } = getEntitlementsSafe(userType);

    let messageCount = 0;
    if (session.user.id !== "guest") {
      messageCount = await getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 24,
      });
    }

    if (messageCount >= maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      if (!isToolApprovalFlow) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });

      titlePromise = generateTitleFromUserMessage({ message });
    }

    const uiMessages = isToolApprovalFlow
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        if (titlePromise) {
          titlePromise.then((title) => {
            updateChatTitleById({ chatId: id, title });
            dataStream.write({ type: "data-chat-title", data: title });
          });
        }

        const isReasoningModel =
          selectedChatModel.includes("reasoning") ||
          selectedChatModel.includes("thinking");

        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: await convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools: isReasoningModel
            ? []
            : [
                "getWeather",
                "createDocument",
                "updateDocument",
                "requestSuggestions",
              ],
          experimental_transform: isReasoningModel
            ? undefined
            : smoothStream({ chunking: "word" }),
          providerOptions: isReasoningModel
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: 10_000 },
                },
              }
            : undefined,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      try {
        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => stream.pipeThrough(new JsonToSseTransformStream())
        );
        if (resumableStream) {
          return new Response(resumableStream);
        }
      } catch (error) {
        console.error("Failed to create resumable stream:", error);
      }
    }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await getAppSession();

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
