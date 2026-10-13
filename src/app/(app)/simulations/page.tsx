import { getCurrentUser, getSimulations, resultsOf } from "@/lib/data";
import { SimulationHistoryView } from "@/components/views/simulations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulations" };

export default async function SimulationsPage() {
  const user = await getCurrentUser();
  const sims = await getSimulations(user.id, 100);
  return (
    <SimulationHistoryView
      currency={user.currency}
      sims={sims.map((s) => {
        const r = resultsOf(s);
        return { id: s.id, name: s.name, createdAt: s.createdAt.toISOString(), paths: s.paths, horizonYears: s.horizonYears, status: s.status, scenarioId: s.scenarioId, finalP50: r?.final.p50 ?? null, goalProbability: r?.goal?.probability ?? null, shortfall: r?.risk.shortfallProbability ?? null, riskLevel: r?.risk.level ?? null, baselineP50: r?.baseline?.finalP50 ?? null };
      })}
    />
  );
}
