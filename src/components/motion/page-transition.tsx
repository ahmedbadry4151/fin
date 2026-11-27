"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PAGE, PAGE_EXIT } from "./tokens";

/**
 * Route-level enter/exit wrapper for the App Router.
 * Mounted in the persistent (app) layout so AnimatePresence survives navigation;
 * keyed by pathname so outgoing content animates out before incoming content in.
 * Markup is identical on server and client (no reduced-motion render branching);
 * reduced motion is handled by the .motion-reveal CSS override in globals.css.
 */
export function PageTransitions({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className="motion-reveal"
        initial={{ opacity: 0.35, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.985, transition: PAGE_EXIT }}
        transition={PAGE}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
