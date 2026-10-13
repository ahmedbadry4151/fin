import { SavingsAnalytics } from "@/components/views/analytics";
import { loadAnalytics } from "../data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Savings Analytics" };
export default async function Page() {
  const { user, twin, months, history } = await loadAnalytics();
  return <SavingsAnalytics currency={user.currency} metrics={twin.metrics} months={months} netWorthHistory={history} emergencySavings={twin.input.emergencySavings} />;
}
