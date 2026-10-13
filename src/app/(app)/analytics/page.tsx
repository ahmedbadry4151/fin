import { AnalyticsOverview } from "@/components/views/analytics";
import { loadAnalytics } from "./data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };
export default async function Page() {
  const { user, twin, months, history } = await loadAnalytics();
  return <AnalyticsOverview currency={user.currency} metrics={twin.metrics} months={months} netWorthHistory={history} goals={twin.goals.map((g) => ({ name: g.name, progress: g.targetAmount ? g.currentAmount / g.targetAmount : 0 }))} />;
}
