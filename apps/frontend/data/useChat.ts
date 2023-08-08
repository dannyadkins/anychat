"use client";

import useSWR, { KeyedMutator } from "swr";
import { useRef, useEffect, useState } from "react";
import { revalidatePath, revalidateTag } from "next/cache";

interface IUseChatOptions {
  conversationId?: string;
  parentMessageId?: string;
  initialMessages?: any[];
}

/*
 *
 * Enables message editing.
 *
 */
export function useChat({
  conversationId = "",
  initialMessages = [],
}: IUseChatOptions) {
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
  const sendMessage = async (
    content: string,
    parentId?: string,
    onSend?: (args: any) => any,
    messageOverride?: any[]
  ) => {
    // TODO if there is a parentId, only pass in messages before that parentId to newMessages
    // TODO add parentId in database
    // TODO save this ID in database as is

    const historyToUse = messageOverride || messagesRef.current;

    console.log("Sending message with conversationId: ", conversationId);
    if (!conversationId?.length) {
      if (messages?.at(-1)?.conversationId) {
        conversationId = messages?.at(-1)?.conversationId;
      } else {
        // TODO: create a new conversation, send message, router refresh
        let { data } = await fetch("http://localhost:3000/api/conversations", {
          method: "POST",
          body: JSON.stringify({
            title: content?.slice(0, 20) || "Untitled",
          }),
          cache: "no-store",
        }).then((res) => res.json());
        conversationId = data;
      }
    }
    const userMessageId = Math.random().toString(36).substring(7);
    const responseId = Math.random().toString(36).substring(7);

    const previousMessages = messagesRef.current;

    console.log("Previous message id: ", previousMessages.at(-1)?.id);
    const newMessages = historyToUse.concat({
      id: userMessageId,
      content: content,
      role: "user",
      //   If they want to manually fork (edit an old message), we need to pass in the parentId
      parentId: parentId || messagesRef.current.at(-1)?.id,
      //   If there is a branch, this shows where the branch started
      rootId: parentId || messagesRef.current.at(-1)?.rootId,
      conversationId,
    });

    try {
      mutateIsLoading(true);
      mutate(newMessages, false);
      onSend?.(newMessages);

      await getGenerationStream(
        `http://localhost:3000/api/conversations/${conversationId}`,
        newMessages,
        responseId,
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
    isLoading,
  };
}

const getGenerationStream = async (
  apiUrl: string,
  messages: any[],
  responseId: string,
  onTokens: (tokens: any[]) => void
) => {
  // TODO important replace this with a proper conversation endpoint so it can save stuff
  const res = await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify({
      messages,
      responseId,
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
    id: responseId,
    createdAt,
    content: "",
    role: "assistant",
    parentId: messages.at(-1)?.id,
    conversationId: messages.at(-1)?.conversationId,
    rootId: messages.at(-1)?.rootId,
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
