// app/api/openai.js
import { Configuration, OpenAIApi } from "openai-edge";
// import Redis from "ioredis";
import { NextResponse, NextRequest } from "next/server";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const runtime = "edge";

// const redis = new Redis(); // Configure according to your Redis setup

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const strippedMessages = messages.map((message: any) => {
    return { content: message.content, role: message.role };
  });

  const convoId = "some-convo-id";

  //   if its already started, error
  //   if ((await redis.get(convoId + "-status")) === "started") {
  //     return NextResponse.error();
  //   }

  await redis.set(convoId + "-message", "");

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      //   @ts-ignore
      messages: strippedMessages,
      max_tokens: 500,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
      onToken: async (data) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          //   put in Vercel KV
          await redis.lpush(convoId + "-tokens", message);
        }
      },
      onStart: async () => {
        await redis.set(convoId + "-status", "started");
        await redis.del(convoId + "-tokens");
        await redis.del(convoId + "-message");
      },
      onCompletion: async () => {
        await redis.set(convoId + "-status", "completed");
      },
    });

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error with generation: ", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
