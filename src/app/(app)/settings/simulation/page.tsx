import { getCurrentUser, getTwin } from "@/lib/data";
import { SimulationSettingsView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Simulation Settings" };
export default async function Page() {
  const u = await getCurrentUser();
  const twin = await getTwin(u);
  return <SimulationSettingsView settings={(u.settings as Record<string, unknown>) ?? {}} planningStyle={u.planningStyle} horizon={twin.econ.horizonYears} />;
}
