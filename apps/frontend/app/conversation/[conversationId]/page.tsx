import { ChatContainer } from "@/components/ChatContainer/ChatContainer";
import { getPrismaClient } from "database";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: any }) {
  const { conversationId } = params;

  const { data: messages } = await fetch(
    `http://localhost:3000/api/conversations/${conversationId}`,
    {
      method: "GET",
      next: {
        tags: ["messages"],
      },
      cache: "no-store",
    }
  ).then((res) => {
    return res.json();
  });

  return (
    <ChatContainer conversationId={conversationId} initialMessages={messages} />
  );
}
