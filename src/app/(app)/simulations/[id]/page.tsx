import { notFound } from "next/navigation";
import { getCurrentUser, getScenario, getSimulation, getTwin, resultsOf } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { SimulationResultsView } from "@/components/views/simulations";
import type { ScenarioParams } from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulation Results" };

export default async function SimulationResultsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const [twin, sim] = await Promise.all([getTwin(user), getSimulation(user.id, Number(id))]);
  const results = resultsOf(sim);
  if (!sim || !results) notFound();
  const scenario = sim.scenarioId ? await getScenario(user.id, sim.scenarioId) : null;
  const goal = twin.goals.find((g) => g.id === sim.goalId) ?? null;
  const simTwin = buildSimTwin(twin.input, goal ? { ...goal, targetDate: String(goal.targetDate) } : null);
  const allowed = ["overview", "distribution", "risk", "sensitivity", "model"];
  return (
    <SimulationResultsView
      currency={user.currency}
      sim={{ id: sim.id, name: sim.name, createdAt: sim.createdAt.toISOString(), paths: sim.paths, horizonYears: sim.horizonYears, goalName: goal?.name ?? null }}
      results={results}
      scenario={scenario ? { id: scenario.id, name: scenario.name } : null}
      simTwin={simTwin}
      params={(results.params ?? {}) as ScenarioParams}
      tab={tab && allowed.includes(tab) ? tab : "overview"}
    />
  );
}
