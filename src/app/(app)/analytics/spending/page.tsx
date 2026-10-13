import { SpendingAnalytics } from "@/components/views/analytics";
import { loadAnalytics } from "../data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Spending Analytics" };
export default async function Page() {
  const { user, twin, months, history } = await loadAnalytics();
  return <SpendingAnalytics currency={user.currency} metrics={twin.metrics} months={months} netWorthHistory={history} />;
}
