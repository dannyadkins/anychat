import { getPrismaClient } from "database";

import styles from "./Sidebar.module.scss";
import Link from "next/link";
import classNames from "classnames";

import { AnimatePresence, motion } from "framer-motion";
import { WrappedAnimatePresence, WrappedMotion } from "./WrappedMotion";

export async function Sidebar() {
  // get conversations

  //   TODO refactor this to extract userId directly in middleware
  const userId = "some-user-id";
  const client = getPrismaClient(userId);

  const { data: conversations } = await fetch(
    `http://localhost:3000/api/conversations`,
    {
      method: "GET",
      next: {
        tags: ["conversations"],
      },
    }
  ).then((res) => {
    return res.json();
  });

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <Link href="/" className={classNames(styles.button, "w-full")}>
          <span>+</span> <span>New chat</span>
        </Link>
        <div className={classNames(styles.button, "w-[40px]")}>/</div>
      </div>
      <WrappedAnimatePresence>
        <div className={"flex flex-col gap-1"}>
          {/* TODO: add typing */}
          {conversations.map((conversation: any) => (
            <WrappedMotion
              key={conversation.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Link
                href={`/conversation/${conversation.id}`}
                key={conversation.id}
              >
                <div className={styles.conversation}>{conversation.title}</div>
              </Link>
            </WrappedMotion>
          ))}
        </div>
      </WrappedAnimatePresence>
    </div>
  );
}
