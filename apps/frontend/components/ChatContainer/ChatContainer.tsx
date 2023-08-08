"use client";

import { useChat } from "@/data/useChat";
import { sendMessage } from "./actions";
import styles from "./ChatContainer.module.scss";
import classNames from "classnames";

interface IChatProps {
  history?: any[];
  conversationId: string;
}

export function ChatContainer(props: IChatProps) {
  const { history, conversationId } = props;
  const { messages, input, setInput, sendMessage } = useChat({
    conversationId,
  });
  console.log("messages: ", messages);

  return (
    <div className="h-screen flex flex-col items-center">
      <div className="grow overflow-scroll flex flex-col items-end justify-end w-full">
        {messages.length > 0
          ? messages.map((m) => <Message key={m.id} message={m} />)
          : null}
      </div>
      <div className={styles.prompt}>
        {/* @ts-ignore */}
        <form
          onSubmit={(e) => {
            // TODO allow editing of messages
            e.preventDefault();
            sendMessage("");
          }}
        >
          <input
            value={input}
            placeholder="Send a message"
            onChange={(e) => {
              setInput(e.target.value);
            }}
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
