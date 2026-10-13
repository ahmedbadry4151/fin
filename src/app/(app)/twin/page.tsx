import { redirect } from "next/navigation";
import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { runSimulation } from "@/lib/simulation";
import { TwinView } from "@/components/views/twin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Twin" };

export default async function TwinPage() {
  const user = await getCurrentUser();
  if (!user.onboarded) redirect("/onboarding");
  const twin = await getTwin(user);
  const goalProbabilities: Record<number, number> = {};
  for (const g of twin.goals) {
    const res = runSimulation(buildSimTwin(twin.input, { ...g, targetDate: String(g.targetDate) }), twin.econ, {}, { paths: 120, seed: 5 + g.id });
    if (res.goal) goalProbabilities[g.id] = res.goal.probability;
  }
  return (
    <TwinView
      currency={user.currency}
      metrics={twin.metrics}
      profile={{ monthlyIncome: twin.profile.monthlyIncome, additionalIncome: twin.profile.additionalIncome, incomeFrequency: twin.profile.incomeFrequency, expenses: twin.profile.expenses ?? {}, cashSavings: twin.profile.cashSavings, emergencySavings: twin.profile.emergencySavings, monthlySavings: twin.profile.monthlySavings }}
      accounts={twin.accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance }))}
      assets={twin.assets}
      liabilities={twin.liabilities}
      goals={twin.goals.map((g) => ({ ...g, targetDate: String(g.targetDate) }))}
      econ={twin.econ}
      goalProbabilities={goalProbabilities}
    />
  );
}
