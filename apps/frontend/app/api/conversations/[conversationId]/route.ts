import { getPrismaClient } from "database";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { AIStream, StreamingTextResponse } from "ai";

const redis = Redis.fromEnv();
const userId = "someUserId";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
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
  const { messages, responseId } = await req.json();
  const { conversationId } = params;

  const inputMessage = messages[messages.length - 1];

  const client = getPrismaClient(userId);
  await client.message
    .create({
      data: {
        id: inputMessage.id,
        content: inputMessage.content,
        role: inputMessage.role,
        conversationId,
        parentId: inputMessage.parentId,
        rootId: inputMessage.rootId,
        userId,
      },
    })
    .catch((e: Error) => {
      console.log("Error saving message", e);
    });

  const response = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
    body: JSON.stringify({
      messages,
      conversationId,
    }),
  });

  const stream = response.body;
  const transformed = stream?.pipeThrough(
    aggregatedResponseHandler(
      conversationId,
      userId,
      responseId,
      inputMessage.id,
      inputMessage.rootId
    )
  );

  return new StreamingTextResponse(transformed!);
}

const aggregatedResponseHandler = (
  conversationId: string,
  userId: string,
  responseId: string,
  parentId: string,
  rootId: string
): TransformStream<any, Uint8Array> => {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  let aggregatedResponse = "";

  return new TransformStream({
    async transform(message, controller): Promise<void> {
      controller.enqueue(message);
      aggregatedResponse += textDecoder.decode(message);
    },

    async flush(): Promise<void> {
      await saveFullResponseToDatabase(
        aggregatedResponse,
        conversationId,
        userId,
        responseId,
        parentId,
        rootId
      );
    },
  });
};

async function saveFullResponseToDatabase(
  message: string,
  conversationId: string,
  userId: string,
  responseId: string,
  parentId: string,
  rootId: string
) {
  const client = getPrismaClient(userId);
  return await client.message.create({
    data: {
      id: responseId,
      content: message,
      role: "assistant",
      conversationId,
      userId,
      parentId,
      rootId,
    },
  });
}
