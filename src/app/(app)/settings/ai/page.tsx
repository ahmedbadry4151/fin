import { getCurrentUser } from "@/lib/data";
import { AiSettingsView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "AI Settings" };
export default async function Page() {
  const u = await getCurrentUser();
  return <AiSettingsView settings={(u.settings as Record<string, unknown>) ?? {}} />;
}
