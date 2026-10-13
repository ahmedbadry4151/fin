import { notFound } from "next/navigation";
import { getCurrentUser, getLatestSimulation, getReport, getSimulation, getTwin, resultsOf } from "@/lib/data";
import { answerQuestion } from "@/lib/intelligence";
import { ReportPreview } from "@/components/views/reports";
export const dynamic = "force-dynamic";
export const metadata = { title: "Report Preview" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [twin, report] = await Promise.all([getTwin(user), getReport(user.id, Number(id))]);
  if (!report) notFound();
  const cfg = report.config as { simulationId?: number | null; sections?: string[]; notes?: string; range?: string; goalIds?: number[] };
  const sim = cfg.simulationId ? await getSimulation(user.id, cfg.simulationId) : await getLatestSimulation(user.id);
  const results = resultsOf(sim);
  const ai = answerQuestion("Explain my net worth projection", { currency: user.currency, input: twin.input, metrics: twin.metrics, econ: twin.econ, goals: twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) })), recentTransactions: [], scenarios: [], latestSimulation: null });
  const goals = twin.goals.filter((g) => !cfg.goalIds || cfg.goalIds.includes(g.id)).map((g) => ({ id: g.id, name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, targetDate: String(g.targetDate) }));
  return (
    <ReportPreview
      currency={user.currency}
      report={{ id: report.id, name: report.name, type: report.type, createdAt: report.createdAt.toISOString(), config: cfg }}
      user={{ name: user.name }}
      metrics={twin.metrics}
      econ={twin.econ}
      goals={goals}
      simulation={sim && results ? { name: sim.name, paths: sim.paths, horizonYears: sim.horizonYears, results } : null}
      aiText={ai.text}
    />
  );
}
