import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { AiScenarioBuilder } from "@/components/views/scenarios";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Scenario Builder" };

export default async function AiScenarioPage() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const g = twin.goals[0];
  return <AiScenarioBuilder currency={user.currency} simTwin={buildSimTwin(twin.input, g ? { ...g, targetDate: String(g.targetDate) } : null)} econ={twin.econ} />;
}
