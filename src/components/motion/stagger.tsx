"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

export function containerVariants(stagger = 0.06, delay = 0): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
}

export function Stagger({
  children,
  className,
  stagger = 0.06,
  delay = 0,
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
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className, delay = 0, y = 14 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
