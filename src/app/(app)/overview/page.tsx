import { redirect } from "next/navigation";
import { getCurrentUser, getSimulations, getTwin, resultsOf } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { runSimulation } from "@/lib/simulation";
import { OverviewView } from "@/components/views/overview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user.onboarded) redirect("/onboarding");
  const twin = await getTwin(user);
  const sims = await getSimulations(user.id, 6);
  const baselineSim = sims.find((s) => s.scenarioId === null) ?? null;
  let baseline = resultsOf(baselineSim);
  if (!baseline) {
    const simTwin = buildSimTwin(twin.input, twin.goals[0] ? { ...twin.goals[0], targetDate: String(twin.goals[0].targetDate) } : null);
    baseline = runSimulation(simTwin, twin.econ, {}, { paths: 200, seed: 11, sensitivity: true, baseline: false });
  }
  return (
    <OverviewView
      user={{ name: user.name, currency: user.currency }}
      metrics={twin.metrics}
      econ={twin.econ}
      emergencySavings={twin.input.emergencySavings}
      goals={twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) }))}
      baseline={baseline}
      simulations={sims.map((s) => {
        const r = resultsOf(s);
        return { id: s.id, name: s.name, createdAt: s.createdAt.toISOString(), paths: s.paths, horizonYears: s.horizonYears, finalP50: r?.final.p50 ?? null, goalProbability: r?.goal?.probability ?? null, riskLevel: r?.risk.level ?? null };
      })}
    />
  );
}
