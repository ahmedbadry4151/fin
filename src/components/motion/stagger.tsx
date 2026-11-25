"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { DUR, EASE_OUT } from "./tokens";

export { DUR, EASE_OUT, EASE_IN, EASE_IN_OUT, SPRING } from "./tokens";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.entrance, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
};

export function containerVariants(stagger: number = DUR.stagger, delay: number = DUR.leadIn): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
}

export function Stagger({
  children,
  className,
  stagger = DUR.stagger,
  delay = DUR.leadIn,
  inView = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  inView?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={containerVariants(stagger, delay)}
      initial="hidden"
      {...(inView ? { whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } } : { animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, variants = fadeUp }: { children: ReactNode; className?: string; variants?: Variants }) {
  return (
    <motion.div className={`motion-reveal ${className ?? ""}`} variants={variants}>
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className, delay = 0, y = 14 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={`motion-reveal ${className ?? ""}`}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: DUR.entrance, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
