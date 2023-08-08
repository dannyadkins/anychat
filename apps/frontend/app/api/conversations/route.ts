import { getPrismaClient } from "database";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // TODO: get userId from middleware
  const userId = "some-user-id";

  const client = getPrismaClient(userId);

  const conversation = await client.conversation.create({
    data: {
      title: "Some new convo",
      //   messages: {
      //     create: [
      //       {
      //         content: "Hey",
      //         role: "user",
      //       },
      //     ],
      //   },
      userId: userId,
    },
  });

  return NextResponse.json({
    conversationId: conversation.id,
  });
}

export async function GET() {
  const userId = "some-user-id";

  const client = getPrismaClient(userId);

  const conversations = await client.conversation.findMany({
    where: {
      userId,
    },
  });

  return NextResponse.json({
    data: conversations,
  });
}
