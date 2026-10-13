import { NetWorthAnalytics } from "@/components/views/analytics";
import { loadAnalytics } from "../data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Net Worth Analytics" };
export default async function Page() {
  const { user, twin, months, history } = await loadAnalytics();
  const m = twin.metrics;
  const breakdown = [
    { label: "Cash", value: m.cash, color: "var(--ink)" },
    { label: "Investments", value: m.investments, color: "var(--accent)" },
    { label: "Property & other", value: m.otherAssets, color: "var(--subtle)" },
  ].filter((b) => b.value > 0);
  return <NetWorthAnalytics currency={user.currency} metrics={m} months={months} netWorthHistory={history} breakdown={breakdown} />;
}
