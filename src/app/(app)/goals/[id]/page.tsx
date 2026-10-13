import { notFound } from "next/navigation";
import { getCurrentUser, getTwin, getScenarios } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { runSimulation, type ScenarioParams } from "@/lib/simulation";
import { GoalDetailView } from "@/components/views/goals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goal" };

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const goal = twin.goals.find((g) => g.id === Number(id));
  if (!goal) notFound();
  const simTwin = buildSimTwin(twin.input, { ...goal, targetDate: String(goal.targetDate) });
  const baseline = runSimulation(simTwin, twin.econ, {}, { paths: 300, seed: 31 });
  const scenarios = (await getScenarios(user.id)).slice(0, 4);
  const impacts = scenarios.map((s) => {
    const r = runSimulation(simTwin, twin.econ, s.params as ScenarioParams, { paths: 150, seed: 31 });
    return { id: s.id, name: s.name, probability: r.goal?.probability ?? 0, medianFund: r.goal?.medianFund ?? 0 };
  });
  return <GoalDetailView currency={user.currency} goal={{ ...goal, targetDate: String(goal.targetDate) }} econ={twin.econ} baseline={baseline} impacts={impacts} />;
}
