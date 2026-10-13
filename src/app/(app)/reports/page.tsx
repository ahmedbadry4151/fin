import { getCurrentUser, getReports } from "@/lib/data";
import { ReportsView } from "@/components/views/reports";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };
export default async function Page() {
  const user = await getCurrentUser();
  const reports = await getReports(user.id);
  return <ReportsView reports={reports.map((r) => ({ id: r.id, name: r.name, type: r.type, createdAt: r.createdAt.toISOString() }))} />;
}
