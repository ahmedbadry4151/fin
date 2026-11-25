"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { DUR, EASE_IN, EASE_OUT } from "./tokens";

/**
 * Opacity-only entrance for streaming skeletons. The route wrapper in
 * page-transition.tsx owns route enter/exit; this only softens the moment the
 * skeleton is streamed into the tree. Reduced motion is handled by the
 * .motion-reveal CSS override, so no render-time preference branching occurs.
 */
export function SkeletonTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      data-ft-skeleton=""
      className={`motion-reveal ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }}
      transition={{ duration: DUR.fast, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
