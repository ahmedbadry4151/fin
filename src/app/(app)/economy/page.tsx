import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { EconomyView } from "@/components/views/economy";
export const dynamic = "force-dynamic";
export const metadata = { title: "Economic Environment" };
export default async function Page() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const a = twin.assumptions;
  const stored = { inflation: a.inflation, incomeGrowth: a.incomeGrowth, expenseGrowth: a.expenseGrowth, investmentReturn: a.investmentReturn, volatility: a.volatility, horizonYears: a.horizonYears };
  const g = twin.goals[0];
  return <EconomyView currency={user.currency} econ={twin.econ} stored={stored} preset={a.preset} simTwin={buildSimTwin(twin.input, g ? { ...g, targetDate: String(g.targetDate) } : null)} />;
}
