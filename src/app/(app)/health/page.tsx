import { HealthView } from "@/components/views/analytics";
import { loadAnalytics } from "../analytics/data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Health" };
export default async function Page() {
  const { user, twin, history } = await loadAnalytics();
  const active = twin.goals.filter((g) => g.targetAmount > 0);
  const goalProgress = active.length ? active.reduce((s, g) => s + Math.min(1, g.currentAmount / g.targetAmount), 0) / active.length : 0;
  return <HealthView currency={user.currency} metrics={twin.metrics} netWorthTrend={history.length > 1 ? history[history.length - 1].value - history[0].value : 0} goalProgress={goalProgress} emergencySavings={twin.input.emergencySavings} />;
}
