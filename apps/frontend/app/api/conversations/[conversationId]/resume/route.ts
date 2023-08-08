import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { pipeline } from "stream/promises";

const redis = Redis.fromEnv();

export const runtime = "nodejs";

// This is required to enable streaming
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = params;

  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  const encoder = new TextEncoder();

  // subscribe to redis
  //   get all key items
  const priorCurrentMessage: string =
    (await redis.get(conversationId + "-message")) || "";

  sendSSE(writer, encoder, priorCurrentMessage);
  console.log("Prior current message: ", priorCurrentMessage);

  //   now set an interval to send new tokens from Redis
  //   const interval = setInterval(async () => {
  //     console.log("Looking for new tokens...");
  //     const numTokens = (await redis.llen(conversationId + "-tokens")) || 0;
  //     console.log("Fetching num tokens:", numTokens);
  //     // pop all tokens
  //     const newTokens: string[] =
  //       (await redis.lpop(conversationId + "-tokens", numTokens)) || [];

  //     console.log("Received tokens: ", newTokens);

  //     const newCurrentMessage = newTokens.reverse().join("");
  //     console.log("The current message is: ", newCurrentMessage);

  //     sendSSE(writer, encoder, newCurrentMessage);
  //     await redis.append(conversationId + "-message", newCurrentMessage);

  //     if ((await redis.get(conversationId + "-status")) === "completed") {
  //       console.log(
  //         "Conversation completed, closing stream and stopping interval"
  //       );
  //       writer.close();
  //       clearInterval(interval);
  //     }
  //   }, 300);

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

const sendSSE = async (
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  data: string
) => {
  await writer.ready;
  await writer.write(encoder.encode(data));
};
