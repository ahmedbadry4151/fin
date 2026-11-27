import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageTransitions } from "@/components/motion/page-transition";
import { getCurrentUser, getTwin, getUnreadCount } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const unread = await getUnreadCount(user.id);
  return (
    <AppShell user={{ id: user.id, name: user.name, email: user.email, currency: user.currency }} unread={unread} accounts={twin.accounts.map((a) => ({ id: a.id, name: a.name }))}>
      <PageTransitions>{children}</PageTransitions>
    </AppShell>
  );
}
