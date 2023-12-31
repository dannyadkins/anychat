"use client";

import { AnimatePresence, motion } from "framer-motion";

export function WrappedAnimatePresence({ children, ...props }) {
  return <AnimatePresence {...props}>{children}</AnimatePresence>;
}

// @ts-ignore
export function WrappedMotion({ children, ...props }) {
  return <motion.div {...props}>{children}</motion.div>;
}
