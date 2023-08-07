// app/api/openai.js
import { Configuration, OpenAIApi } from "openai-edge";
// import Redis from "ioredis";
import { NextResponse, NextRequest } from "next/server";
import { OpenAIStream, StreamingTextResponse } from "ai";

export const runtime = "edge";

// const redis = new Redis(); // Configure according to your Redis setup

export async function GET() {
  //   const { messages } = await req.json();

  const messages = [
    {
      content: "Pretend you're a philosopher",
      role: "user",
    },
  ];

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response, {
      onToken: (data) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: string) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          //   put in Vercel KV
        }
      },
    });

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}
