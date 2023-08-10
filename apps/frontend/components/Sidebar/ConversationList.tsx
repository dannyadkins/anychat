"use client";

import classNames from "classnames";
import styles from "./Sidebar.module.scss";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

export function ConversationList({ conversations }: { conversations: any[] }) {
  return (
    <>
      <AnimatePresence>
        <div className={"flex flex-col gap-1 overflow-y-scroll h-full"}>
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
