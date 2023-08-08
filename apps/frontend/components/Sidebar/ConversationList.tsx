"use client";

import classNames from "classnames";
import styles from "./Sidebar.module.scss";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export function ConversationList({ conversations }: { conversations: any[] }) {
  const segment = useSelectedLayoutSegment();
  console.log("Segment: ", segment);
  return (
    <>
      <AnimatePresence>
        <div className={"flex flex-col gap-1"}>
          {/* TODO: add typing */}
          {conversations.map((conversation: any) => (
            <motion.div
              key={conversation.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Link
                href={`/conversation/${conversation.id}`}
                key={conversation.id}
              >
                <div className={classNames(styles.conversation)}>
                  {conversation.title}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </>
  );
}