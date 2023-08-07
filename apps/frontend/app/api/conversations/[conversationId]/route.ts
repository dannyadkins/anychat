import { Configuration, OpenAIApi } from "openai";

export async function GET({ params }: any) {
  const { conversationId } = params;

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const openaiRes = await openai.createCompletion(
      {
        model: "text-davinci-002",
        prompt: "Vercel is a platform for",
        max_tokens: 100,
        temperature: 0,
        stream: true,
      },
      { responseType: "stream" }
    );

    // @ts-ignore
    openaiRes.data.on("data", (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line: string) => line.trim() !== "");
      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        if (message !== "[DONE]") {
          try {
            const parsed = JSON.parse(message);
            redis.publish("openai-channel", parsed.choices[0].text);
          } catch (error) {
            console.error(
              "Could not JSON parse stream message",
              message,
              error
            );
          }
        }
      }
    });

    return NextResponse.json({ status: 200, body: { conversationId } });
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}
