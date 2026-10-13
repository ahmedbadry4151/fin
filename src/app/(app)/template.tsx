import type { ReactNode } from "react";
import { PageTransition } from "@/components/motion/primitives";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
