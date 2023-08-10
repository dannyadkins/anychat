"use client";

import { useChat } from "@/data/useChat";
import { sendMessage } from "./actions";
import styles from "./ChatContainer.module.scss";
import classNames from "classnames";
import { useRef, useEffect, useState, useCallback } from "react";
import { Dropdown } from "../Dropdown/Dropdown";
import { Button } from "../Button/Button";

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

  const [messagesToDisplay, setMessagesToDisplay] = useState(messages);
  const [model, setModel] = useState("gpt-3.5-turbo");

  const [branchToShow, setBranchToShow] = useState<any>({});

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

  // TODO wrap in a usecallback bc this is expensive
  const constructTree = useCallback(
    (messages: any[]) => {
      if (!messages.length) {
        return [];
      }
      // take a bunch of messages
      // for each message with many children, construct "branch" objects, which represent each children and each childrens' descendants, until another branch is seen
      // for each message with branches, have a state var that tracks which branch is chosen, default 0

      // Construct parent2children map
      const parent2children = messages.reduce((acc, m) => {
        acc[m.id] = messages.filter((m2) => m2.parentId === m.id);
        return acc;
      }, {});

      // Construct branch objects by traversing starting from the top
      // looks like:
      // { "root": [[m1, m2, m3...]], "m3": [[m4, m5, m6...], [m12, m13, m14]] }

      const messagesToShow = [];
      let root = messages[0];

      while (true) {
        messagesToShow.push({
          ...root,
          numChildren: parent2children[root.id].length,
        });
        const children = parent2children[root.id];
        if (children.length > 1) {
          root = children[branchToShow[root.id] || 0];
        } else if (children.length === 1) {
          root = children[0];
        } else if (children.length === 0) {
          break;
        }

        if (Object.keys(parent2children).length === 0) {
          break;
        }
      }
      return messagesToShow;
    },
    [branchToShow, messages]
  );

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    setMessagesToDisplay(constructTree(messages));
  }, [branchToShow, messages]);

  return (
    <div className="max-h-screen w-full flex flex-col items-center ">
      <div className="grow overflow-scroll w-full" ref={ref}>
        {messages.length > 0 ? (
          messagesToDisplay.map((m) => {
            const numBranches = messages.filter(
              (m2) => m2.parentId === m.parentId
            )?.length;

            return (
              <Message
                key={m.id}
                message={m}
                sendMessage={sendMessage}
                setBranchToShow={(idx: number) => {
                  setBranchToShow((old: any) => {
                    return {
                      ...old,
                      [m.parentId]: idx,
                    };
                  });
                }}
                incrementBranchToShow={(override?: boolean) => {
                  setBranchToShow((old: any) => {
                    return {
                      ...old,
                      [m.parentId]: override
                        ? (old[m.parentId] || 0) + 1
                        : Math.min((old[m.parentId] || 0) + 1, numBranches - 1),
                    };
                  });
                }}
                decrementBranchToShow={() => {
                  setBranchToShow((old: any) => {
                    return {
                      ...old,
                      [m.parentId]: Math.max((old[m.parentId] || 0) - 1, 0),
                    };
                  });
                }}
                numBranches={numBranches}
                branchToShow={branchToShow[m.parentId]}
                messagesBeforeThis={messagesToDisplay.slice(
                  0,
                  messagesToDisplay.findIndex((m2) => m2.id === m.id)
                )}
              />
            );
          })
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
            sendMessage(
              input,
              messagesToDisplay?.at(-1)?.id || "",
              () => {
                setInput("");
              },
              messagesToDisplay
            );
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
  const {
    message,
    sendMessage,
    incrementBranchToShow,
    decrementBranchToShow,
    setBranchToShow,
    branchToShow,
    numBranches,
    messagesBeforeThis,
  } = props;
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
        <span className={classNames(styles.message__inner, "relative group")}>
          {message.content}

          {numBranches > 1 && (
            <div className="absolute top-0 -left-16  text-xs">
              <div className="flex flex-row gap-1 w-[40px]  h-[1.6em] items-end">
                <span
                  onClick={() => {
                    decrementBranchToShow();
                  }}
                  className={styles.counterButton}
                >
                  {"<"}
                </span>
                <span>
                  {(branchToShow || 0) + 1}/{numBranches}
                </span>
                <span
                  onClick={() => {
                    incrementBranchToShow();
                  }}
                  className={styles.counterButton}
                >
                  {">"}
                </span>
              </div>
            </div>
          )}

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
        <span className={styles.message__inner}>
          <div className="flex flex-col gap-2 items-center">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
              }}
              className="bg-transparent w-full"
            />
            {/* TODO make this a class and pass in primary */}
            <div className="flex flex-row gap-2">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage(
                    newMessage,
                    message.parentId,
                    () => {
                      setIsEditing(false);
                      setBranchToShow(numBranches);
                    },
                    messagesBeforeThis
                  );
                }}
              >
                Save & submit
              </Button>
              <Button
                variant="transparent"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditing(false);
                  setNewMessage(message.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </span>
      )}
    </div>
  );
};
