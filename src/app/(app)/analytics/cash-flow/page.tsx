import { CashFlowAnalytics } from "@/components/views/analytics";
import { loadAnalytics } from "../data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Cash Flow Analytics" };
export default async function Page() {
  const { user, twin, months, history } = await loadAnalytics();
  return <CashFlowAnalytics currency={user.currency} metrics={twin.metrics} months={months} netWorthHistory={history} />;
}
