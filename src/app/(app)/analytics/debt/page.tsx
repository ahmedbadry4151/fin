import { DebtAnalytics } from "@/components/views/analytics";
import { loadAnalytics } from "../data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Debt Analytics" };
export default async function Page() {
  const { user, twin } = await loadAnalytics();
  const cardDebt = twin.accounts.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  return <DebtAnalytics currency={user.currency} metrics={twin.metrics} liabilities={twin.liabilities} cardDebt={cardDebt} />;
}
