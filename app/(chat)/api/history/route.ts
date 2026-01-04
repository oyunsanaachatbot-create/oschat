import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

type HistoryResponse = {
  items: any[];
  nextCursor?: string | null;
  hasMore?: boolean;
  fallback?: boolean;
};

function ok(items: any[], extra?: Partial<HistoryResponse>) {
  const body: HistoryResponse = {
    items,
    nextCursor: null,
    hasMore: false,
    ...extra,
  };
  return Response.json(body, { status: 200 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const chats = await getChatsByUserId({
      id: session.user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    // ✅ chats нь array эсвэл {items: []} байж болох тул 2 тохиолдлыг хоёуланг нь дэмжинэ
    if (Array.isArray(chats)) {
      return ok(chats);
    }
    if (chats && Array.isArray((chats as any).items)) {
      return ok((chats as any).items, {
        nextCursor: (chats as any).nextCursor ?? null,
        hasMore: (chats as any).hasMore ?? false,
      });
    }

    // ✅ ямар нэг өөр shape ирвэл бас UI-г унагахгүй
    return ok([]);
  } catch (err) {
    console.error("[/api/history] DB query failed:", err);
    // ✅ UI items.length хийж чадах тогтвортой shape
    return ok([], { fallback: true });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const result = await deleteAllChatsByUserId({ userId: session.user.id });
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[/api/history] DELETE failed:", err);
    return Response.json({ ok: false, deleted: 0, fallback: true }, { status: 200 });
  }
}
