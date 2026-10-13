import { getCurrentUser, getScenario, getTwin } from "@/lib/data";
import { SimulationConfigView } from "@/components/views/simulations";
import type { ScenarioParams } from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configure Simulation" };

export default async function NewSimulationPage({ searchParams }: { searchParams: Promise<{ scenario?: string; goal?: string; paths?: string; horizon?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const scenario = sp.scenario ? await getScenario(user.id, Number(sp.scenario)) : null;
  const settings = (user.settings as { defaultPaths?: number } | null) ?? {};
  return (
    <SimulationConfigView
      currency={user.currency}
      scenario={scenario ? { id: scenario.id, name: scenario.name, description: scenario.description ?? "", params: scenario.params as ScenarioParams } : null}
      goals={twin.goals.map((g) => ({ id: g.id, name: g.name, targetAmount: g.targetAmount }))}
      econ={twin.econ}
      defaults={{ paths: Number(sp.paths) || settings.defaultPaths || 600, horizon: Number(sp.horizon) || twin.econ.horizonYears, goalId: sp.goal ? Number(sp.goal) : null }}
      metrics={{ income: twin.metrics.income, expenses: twin.metrics.expenses, netWorth: twin.metrics.netWorth, savings: twin.metrics.savings }}
    />
  );
}
