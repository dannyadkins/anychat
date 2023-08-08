import { ChatContainer } from "@/components/ChatContainer/ChatContainer";

export default function ConversationPage({ params }: { params: any }) {
  const { conversationId } = params;
  return <ChatContainer conversationId={conversationId} />;
}
