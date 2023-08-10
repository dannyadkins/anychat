"use client";

import useLayoutEffect from "./useLayoutEffect";
import React, { useCallback, useRef, useState } from "react";

type RectResult = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
} | null;

const getRect = (element: HTMLElement | null): RectResult | null =>
  element ? element.getBoundingClientRect() : null;

export const useRect = (): [
  RectResult,
  React.MutableRefObject<HTMLDivElement | null>
] => {
  const ref = useRef<HTMLDivElement | null>(null);
  const current = ref.current || null;
  const [rect, setRect] = useState(getRect(current));

  const handleResize = useCallback(() => {
    if (!ref.current) return;
    setRect(getRect(ref.current));
  }, [ref]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    handleResize();
    window.addEventListener("resize", handleResize);
    // eslint-disable-next-line consistent-return
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return [rect, ref];
};
