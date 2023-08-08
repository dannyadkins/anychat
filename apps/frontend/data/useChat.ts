"use client";

import useSWR, { KeyedMutator } from "swr";
import { useRef, useEffect, useState } from "react";

interface IUseChatOptions {
  conversationId: string;
  parentMessageId?: string;
  initialMessages?: any[];
}

/*
 *
 * Enables message editing.
 *
 */
export function useChat({
  conversationId,
  initialMessages = [],
}: IUseChatOptions) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);

  // load initial messages from cache, also TODO: need to figure out how to stream back / append any current stream.
  // just do it in separate req and mutate if so
  const { data, mutate } = useSWR<any[]>(
    [
      `http://localhost:3000/api/conversations/${conversationId}`,
      conversationId,
    ],
    null,
    {
      fallbackData: initialMessages,
    }
  );
  const messages = data! || [];

  //   TODO: on reconnect, call a "resume" function that hits the resume endpoint, sets loading if needed, and streams back

  const { data: isLoading = false, mutate: mutateIsLoading } = useSWR<boolean>(
    [conversationId, "isLoading"],
    null
  );

  // store old messages in case we need to fall back locally
  const messagesRef = useRef<any[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // return fetchMore, which can take a parentMessageId to get a different branch

  // return sendMessage function. If there's a parentId, this .
  // adds the message to state optimistically
  // sends all the messages to the server
  // gets the streamed back message and adds it in
  const sendMessage = async (parentId?: string) => {
    // TODO if there is a parentId, only pass in messages before that parentId to newMessages
    // TODO add parentId in database
    // TODO save this ID in database as is
    const userMessageId = Math.random().toString(36).substring(7);

    const previousMessages = messagesRef.current;
    const newMessages = messagesRef.current.concat({
      id: userMessageId,
      content: input,
      role: "user",
      //   If they want to manually fork (edit an old message), we need to pass in the parentId
      parentId: parentId || messagesRef.current.at(-1)?.id,
      //   If there is a branch, this shows where the branch started
      rootId: parentId || messagesRef.current.at(-1)?.parentId,
    });

    try {
      mutateIsLoading(true);
      mutate(newMessages, false);
      setInput("");

      await getGenerationStream(
        `http://localhost:3000/api/conversations/${conversationId}`,
        newMessages,
        (tokens) => {
          mutate(tokens, false);
        }
      );
      console.log("Done generating");
    } catch (err) {
      mutate(previousMessages, false);
      setError(err as Error);
    } finally {
      mutateIsLoading(false);
    }
  };

  // TODO add in cancel function

  // return isLoading, error, input, setInput
  return {
    messages,
    sendMessage,
    input,
    setInput,
    isLoading,
  };
}

const getGenerationStream = async (
  apiUrl: string,
  messages: any[],
  onTokens: (tokens: any[]) => void
) => {
  // TODO important replace this with a proper conversation endpoint so it can save stuff
  const res = await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify({
      messages,
    }),
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    throw new Error("Error sending message");
  }

  let fullResponseText = "";

  const createdAt = new Date();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const decode = (chunk: Uint8Array) => {
    if (!chunk) {
      return "";
    }
    return decoder.decode(chunk, { stream: true });
  };

  let responseMessage: any = {
    // TODO: get the message ID from the server, or we make it on the client and pass it in
    // id: replyId,
    createdAt,
    content: "",
    role: "assistant",
    parentId: messages.at(-1)?.id,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    fullResponseText += decode(value);

    responseMessage["content"] = fullResponseText;

    onTokens([...messages, { ...responseMessage }]);
  }
  return responseMessage;
};
