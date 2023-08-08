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

export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  console.log("POSTING to this");
  const { messages } = await req.json();
  const { conversationId } = params;

  const userId = "some-user-id";

  const inputMessage = messages[messages.length - 1];

  const client = getPrismaClient(userId);
  await client.message
    .create({
      data: {
        content: inputMessage.content,
        role: inputMessage.role,
        conversationId,
        parentId: inputMessage.parentId,
        rootId: inputMessage.rootId,
        userId,
      },
    })
    .catch((e) => {
      console.log("Error saving message", e);
    });

  console.log("Saved message to conversation ", conversationId);

  const res = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
    body: JSON.stringify({
      messages,
    }),
  });

  return NextResponse.json({
    data: res,
  });
}
