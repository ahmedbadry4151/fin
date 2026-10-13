import { Suspense } from "react";
import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { ScenarioBuilder } from "@/components/views/scenarios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scenario Builder" };

export default async function NewScenarioPage() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const g = twin.goals[0];
  const simTwin = buildSimTwin(twin.input, g ? { ...g, targetDate: String(g.targetDate) } : null);
  return (
    <Suspense>
      <ScenarioBuilder currency={user.currency} simTwin={simTwin} econ={twin.econ} goals={twin.goals.map((x) => ({ id: x.id, name: x.name }))} />
    </Suspense>
  );
}
