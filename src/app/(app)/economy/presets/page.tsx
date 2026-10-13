import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { PresetsView } from "@/components/views/economy";
export const dynamic = "force-dynamic";
export const metadata = { title: "Economic Scenario Presets" };
export default async function Page() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  return <PresetsView currency={user.currency} current={twin.assumptions.preset} simTwin={buildSimTwin(twin.input, null)} horizonYears={twin.econ.horizonYears} />;
}
