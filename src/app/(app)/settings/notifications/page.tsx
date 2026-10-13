import { getCurrentUser } from "@/lib/data";
import { NotificationSettingsView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Notification Settings" };
export default async function Page() {
  const u = await getCurrentUser();
  return <NotificationSettingsView settings={(u.settings as Record<string, unknown>) ?? {}} />;
}
