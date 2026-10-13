import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { runSimulation } from "@/lib/simulation";
import { GoalsView } from "@/components/views/goals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const probabilities: Record<number, number> = {};
  for (const g of twin.goals) {
    const res = runSimulation(buildSimTwin(twin.input, { ...g, targetDate: String(g.targetDate) }), twin.econ, {}, { paths: 150, seed: 21 + g.id });
    if (res.goal) probabilities[g.id] = res.goal.probability;
  }
  return <GoalsView currency={user.currency} goals={twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) }))} probabilities={probabilities} />;
}
