"use client";

import { useChat } from "@/data/useChat";
import { sendMessage } from "./actions";
import styles from "./ChatContainer.module.scss";
import classNames from "classnames";
import { useRef, useEffect } from "react";

interface IChatProps {
  initialMessages?: any[];
  conversationId: string;
}

export function ChatContainer(props: IChatProps) {
  const { initialMessages, conversationId } = props;
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    conversationId,
    initialMessages,
  });

  const ref = useRef(null);
  const scrollDown = () => {
    const chat = ref.current;
    if (chat) {
      chat.scrollTop = chat.scrollHeight;
    }
  };

  useEffect(() => {
    scrollDown();
  }, [messages]);

  return (
    <div className="max-h-screen w-full flex flex-col items-center ">
      <div className="grow overflow-scroll w-full" ref={ref}>
        {messages.length > 0
          ? messages.map((m) => <Message key={m.id} message={m} />)
          : null}
      </div>
      <div className={classNames(styles.prompt, "shrink-0")}>
        {/* @ts-ignore */}
        <form
          onSubmit={(e) => {
            // TODO allow editing of messages
            e.preventDefault();
            sendMessage("");
          }}
          aria-disabled={isLoading}
        >
          <input
            value={input}
            placeholder="Send a message"
            onChange={(e) => {
              setInput(e.target.value);
            }}
            disabled={isLoading}
          />
          {/* <button className="bg-black" type="submit">
            Send
          </button> */}
        </form>
      </div>
    </div>
  );
}

export const Message = ({ message }: any) => {
  return (
    <div
      key={message.id}
      className={classNames(styles.message, "whitespace-pre-wrap", {
        [styles.message__user]: message.role === "user",
        [styles.message__assistant]: message.role === "assistant",
      })}
    >
      <span>
        {message.role === "user" ? "User: " : "AI: "}
        {message.content}
      </span>
    </div>
  );
};
