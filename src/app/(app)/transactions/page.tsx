import { getCurrentUser, getTransactions, getTwin } from "@/lib/data";
import { TransactionsView } from "@/components/views/transactions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; type?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [twin, tx] = await Promise.all([getTwin(user), getTransactions(user.id, { limit: 600 })]);
  return (
    <TransactionsView
      currency={user.currency}
      accounts={twin.accounts.map((a) => ({ id: a.id, name: a.name }))}
      initial={tx.map((t) => ({ id: t.id, description: t.description, category: t.category, type: t.type, amount: t.amount, date: String(t.date), accountId: t.accountId }))}
      initialQuery={sp.q ?? ""}
      initialCategory={sp.category ?? ""}
      initialType={sp.type ?? "all"}
    />
  );
}
