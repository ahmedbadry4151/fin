import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getUnreadCount } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const unread = await getUnreadCount(user.id);
  return (
    <AppShell user={{ id: user.id, name: user.name, email: user.email, currency: user.currency }} unread={unread}>
      {children}
    </AppShell>
  );
}
