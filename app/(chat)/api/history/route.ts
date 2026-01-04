import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const session = await auth();

  // ✅ Guest үед 500/401 болгохгүй — зүгээр хоосон history буцаана
  // (Тэгэхгүй бол sidebar байнга алдаад хоосон харагдана)
  if (!session?.user || session.user.type === "guest") {
    return Response.json({ chats: [], hasMore: false }, { status: 200 });
  }

  try {
    const chats = await getChatsByUserId({
      id: session.user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(chats, { status: 200 });
  } catch (err) {
    console.error("GET /api/history failed:", err);
    // ✅ DB query алдаа гарлаа ч UI-г нураахгүйгээр хоосон буцаая
    return Response.json({ chats: [], hasMore: false }, { status: 200 });
  }
}

export async function DELETE() {
  const session = await auth();

  // ✅ Guest delete хийхгүй (энэ нь зөв)
  if (!session?.user || session.user.type === "guest") {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const result = await deleteAllChatsByUserId({ userId: session.user.id });
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/history failed:", err);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
