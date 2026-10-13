import { getCurrentUser, getTwin, getTransactions, aggregateByMonth } from "@/lib/data";
import { AccountsView } from "@/components/views/accounts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const tx = await getTransactions(user.id, { limit: 2000 });
  const months = aggregateByMonth(tx, 6);
  return <AccountsView currency={user.currency} accounts={twin.accounts.map((a) => ({ ...a, updatedAt: a.updatedAt.toISOString() }))} metrics={twin.metrics} months={months.map((m) => ({ label: m.label, income: m.income, expense: m.expense }))} />;
}
