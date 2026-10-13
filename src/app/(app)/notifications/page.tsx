import { getCurrentUser, getNotifications } from "@/lib/data";
import { NotificationsView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };
export default async function Page() {
  const user = await getCurrentUser();
  const items = await getNotifications(user.id);
  return <NotificationsView items={items.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() }))} />;
}
