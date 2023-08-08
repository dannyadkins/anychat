"use client";

import { useChat } from "@/data/useChat";
import { sendMessage } from "./actions";
import styles from "./ChatContainer.module.scss";
import classNames from "classnames";
import { useRef, useEffect, useState } from "react";
import { Dropdown } from "../Dropdown/Dropdown";

interface IChatProps {
  initialMessages?: any[];
  conversationId: string;
}

export function ChatContainer(props: IChatProps) {
  const { initialMessages, conversationId } = props;
  const { messages, sendMessage, isLoading } = useChat({
    conversationId,
    initialMessages,
  });
  const [model, setModel] = useState("gpt-3.5-turbo");

  const [input, setInput] = useState("");

  const ref = useRef<HTMLDivElement>(null);
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
        {messages.length > 0 ? (
          messages.map((m) => (
            <Message key={m.id} message={m} sendMessage={sendMessage} />
          ))
        ) : (
          <ModelSelector setModel={setModel} model={model} />
        )}
      </div>
      <div className={classNames(styles.prompt, "shrink-0")}>
        {/* @ts-ignore */}
        <form
          onSubmit={(e) => {
            // TODO allow editing of messages
            e.preventDefault();
            sendMessage(input, "", () => {
              setInput("");
            });
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

const ModelSelector = ({ setModel, model }: any) => {
  return (
    <Dropdown>
      {/* <Dropdown.Items>
        <Dropdown.Item onSelect={() => setModel("gpt-3.5-turbo")}>
          GPT-3.5 Turbo
        </Dropdown.Item>
        <Dropdown.Item onSelect={() => setModel("llama-2-3b")}>
          LLaMa-2
        </Dropdown.Item>
      </Dropdown.Items> */}
    </Dropdown>
  );
};

export const Message = (props: any) => {
  const { message, sendMessage } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [newMessage, setNewMessage] = useState(message.content);

  return (
    <div
      key={message.id}
      className={classNames(styles.message, "whitespace-pre-wrap", {
        [styles.message__user]: message.role === "user",
        [styles.message__assistant]: message.role === "assistant",
      })}
    >
      {!isEditing && (
        <span className="relative group">
          {message.content}
          <span>ID: {message.id}</span>
          <span>PARENT: {message.parentId}</span>
          <span>ROOT: {message.rootId}</span>
          {message.role === "user" && (
            <button
              className="absolute top-0 right-0 group-hover:opacity-100 opacity-0 transition-opacity duration-200 ease-in-out"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
        </span>
      )}
      {isEditing && (
        <span>
          <div className="flex flex-col gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
              }}
              className="bg-transparent"
            />
            {/* TODO make this a class and pass in primary */}
            <button
              onClick={(e) => {
                e.preventDefault();
                sendMessage(newMessage, message.parentId, () => {
                  setIsEditing(false);
                  //  TODO mutate messages
                });
              }}
            >
              Save & submit
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                console.log("Cancelling!");
                setIsEditing(false);
                setNewMessage(message.content);
              }}
            >
              Cancel
            </button>
          </div>
        </span>
      )}
    </div>
  );
};
