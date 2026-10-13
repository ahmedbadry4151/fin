import { getCurrentUser } from "@/lib/data";
import { DEMO_EMAIL } from "@/lib/constants";
import { DataManagementView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Data Management" };
export default async function Page() {
  const u = await getCurrentUser();
  return <DataManagementView isDemo={u.email === DEMO_EMAIL} />;
}
