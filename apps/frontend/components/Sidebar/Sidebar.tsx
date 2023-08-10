import { getPrismaClient } from "database";

import styles from "./Sidebar.module.scss";
import Link from "next/link";
import classNames from "classnames";

import { AnimatePresence, motion } from "framer-motion";
import { WrappedAnimatePresence, WrappedMotion } from "./WrappedMotion";
import { ConversationList } from "./ConversationList";

export async function Sidebar() {
  // get conversations

  //   TODO refactor this to extract userId directly in middleware
  const userId = "someUserId";
  const client = getPrismaClient(userId);

  const { data: conversations } = await fetch(
    `http://localhost:3000/api/conversations`,
    {
      method: "GET",
      next: {
        tags: ["conversations"],
      },
      cache: "no-store",
    }
  ).then((res) => {
    return res.json();
  });

  return (
    <div
      className={classNames(
        styles.sidebar,
        "max-h-screen overflow-hidden sm:flex hidden "
      )}
    >
      <div className={styles.header}>
        <Link href="/" className={classNames(styles.button, "w-full")}>
          <span>+</span> <span>New chat</span>
        </Link>
        {/* <div className={classNames(styles.button, "w-[40px]")}>/</div> */}
      </div>
      <ConversationList conversations={conversations} />
    </div>
  );
}
