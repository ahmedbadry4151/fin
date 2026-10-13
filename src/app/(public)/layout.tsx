import type { ReactNode } from "react";
import { PublicNav, PublicFooter } from "@/components/views/marketing";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
