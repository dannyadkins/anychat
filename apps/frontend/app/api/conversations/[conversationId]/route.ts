import { getPrismaClient } from "database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const userId = "some-user-id";

  // TODO ensure the user can only get their own messages

  const { conversationId } = params;
  const client = await getPrismaClient(userId);
  const messages = await client.message.findMany({
    where: {
      conversationId,
    },
  });

  return NextResponse.json({
    data: messages,
  });
}
