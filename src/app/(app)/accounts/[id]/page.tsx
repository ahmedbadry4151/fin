import { notFound } from "next/navigation";
import { getCurrentUser, getTwin, getTransactions, getSimulations, aggregateByMonth } from "@/lib/data";
import { AccountDetailView } from "@/components/views/accounts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const account = twin.accounts.find((a) => a.id === Number(id));
  if (!account) notFound();
  const tx = await getTransactions(user.id, { accountId: account.id, limit: 400 });
  const months = aggregateByMonth(tx, 6);
  const sims = await getSimulations(user.id, 3);
  return (
    <AccountDetailView
      currency={user.currency}
      account={{ ...account, updatedAt: account.updatedAt.toISOString() }}
      transactions={tx.map((t) => ({ id: t.id, description: t.description, category: t.category, type: t.type, amount: t.amount, date: String(t.date), accountId: t.accountId }))}
      months={months.map((m) => ({ label: m.label, income: m.income, expense: m.expense }))}
      goals={twin.goals.map((g) => ({ id: g.id, name: g.name }))}
      simulations={sims.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
