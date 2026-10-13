import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser, getScenario, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { ScenarioBuilder } from "@/components/views/scenarios";
import type { ScenarioParams } from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Scenario" };

export default async function EditScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [twin, scenario] = await Promise.all([getTwin(user), getScenario(user.id, Number(id))]);
  if (!scenario) notFound();
  const g = twin.goals[0];
  return (
    <Suspense>
      <ScenarioBuilder currency={user.currency} simTwin={buildSimTwin(twin.input, g ? { ...g, targetDate: String(g.targetDate) } : null)} econ={twin.econ} goals={twin.goals.map((x) => ({ id: x.id, name: x.name }))} existing={{ id: scenario.id, name: scenario.name, description: scenario.description ?? "", category: scenario.category, templateKey: scenario.templateKey, params: scenario.params as ScenarioParams }} />
    </Suspense>
  );
}
