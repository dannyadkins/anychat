import { ChatContainer } from "@/components/ChatContainer/ChatContainer";
import Image from "next/image";

export default function Home({ params }: { params: any }) {
  const { conversationId } = params;
  return <ChatContainer conversationId={conversationId} />;
}
