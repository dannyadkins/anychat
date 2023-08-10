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
 * Chat functions for any conversation.
 *
 */
export function useChat({
  conversationId = "",
  initialMessages = [],
}: IUseChatOptions) {
  const [error, setError] = useState<Error | null>(null);

  const { data, mutate } = useSWR<any[]>(
    [`api/conversations/${conversationId}`, conversationId],
    null,
    {
      fallbackData: initialMessages,
    }
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages = data! || [];

  const { data: isLoading = false, mutate: mutateIsLoading } = useSWR<boolean>(
    [conversationId, "isLoading"],
    null
  );

  // Store old messages in case we need to fall back
  const messagesRef = useRef<any[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /*
   *
   * This function is the core
   *
   */
  const sendMessage = async (
    content: string,
    parentId?: string,
    onSend?: (args: any) => any,
    messageOverride?: any[]
  ) => {
    const historyToUse = messageOverride || messagesRef.current;

    if (!conversationId?.length) {
      if (messages?.at(-1)?.conversationId) {
        conversationId = messages?.at(-1)?.conversationId;
      } else {
        let { data } = await fetch("api/conversations", {
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

    const newMessage = {
      id: userMessageId,
      content: content,
      role: "user",
      //   If they want to manually fork (edit an old message), we need to pass in the parentId
      parentId: parentId || messagesRef.current.at(-1)?.id,
      //   If there is a branch, this shows where the branch started
      rootId: parentId || messagesRef.current.at(-1)?.rootId,
      conversationId,
    };

    const newUnfilteredMessages = previousMessages.concat(newMessage);
    const newBranchedMessages = historyToUse.concat(newMessage);

    try {
      mutateIsLoading(true);
      mutate(newUnfilteredMessages, false);
      onSend?.(newUnfilteredMessages);

      await getGenerationStream(
        `api/conversations/${conversationId}`,
        newBranchedMessages,
        responseId,
        (tokens) => {
          mutate([...newUnfilteredMessages, { ...tokens }], false);
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

  // TODO: impl "fetchMore", which can take a parentMessageId to get a different branch
  // TODO: on reconnect, call a "resume" function that hits the resume endpoint, sets loading if needed, and streams back
  // TODO: add in "cancel" function
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

    onTokens(responseMessage);
  }
  return responseMessage;
};
