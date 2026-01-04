import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

// ✅ NextAuth Session-ийн оронд минимал app session (type-only)
export type AppSession = {
  user?: {
    id?: string;
  };
};

type UpdateDocumentProps = {
  session: AppSession;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description:
      "Update an existing document artifact. This tool will call other functions that update the document based on the id and kind.",
    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
    }),
    execute: async ({ id, title, content }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return { error: "Document not found" };
      }

      const handler = documentHandlersByArtifactKind.find(
        (h) => h.kind === document.kind
      );

      if (!handler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      // ✅ Callback чинь title/content авахгүй.
      // ✅ Харин "document" + "description" авдаг.
      const descriptionParts: string[] = [];
      if (typeof title === "string") descriptionParts.push("title");
      if (typeof content === "string") descriptionParts.push("content");
      const description =
        descriptionParts.length > 0
          ? `Update document ${descriptionParts.join(" & ")}`
          : "Update document";

      await handler.onUpdateDocument({
        document,
        description,
        dataStream,
        session: session as any, // type-only тохируулга (runtime эвдэхгүй)
      });

      return {
        id,
        title: title ?? document.title,
        kind: document.kind,
        message: "Document updated",
      };
    },
  });
