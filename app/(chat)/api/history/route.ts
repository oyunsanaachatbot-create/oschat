import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

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

  // ✅ session байхгүй үед 401 хэвээр
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

    return Response.json(chats);
  } catch (err) {
    // ✅ DB query алдаа гарсан ч UI-г унагахгүй: 200 + хоосон array
    console.error("[/api/history] DB query failed:", err);

    return Response.json([], {
      status: 200,
      headers: {
        // debugg хийхэд амар (UI-д нөлөөлөхгүй)
        "x-oy-history-fallback": "1",
      },
    });
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

    // ✅ DB алдаа гарсан ч 200 буцаана (UI crash хийхгүй)
    return Response.json(
      { ok: false, deleted: 0, fallback: true },
      { status: 200, headers: { "x-oy-history-fallback": "1" } }
    );
  }
}
