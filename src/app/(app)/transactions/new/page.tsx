import { getCurrentUser, getTwin } from "@/lib/data";
import { TransactionForm } from "@/components/views/transactions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Transaction" };

export default async function NewTransactionPage() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  return <TransactionForm currency={user.currency} accounts={twin.accounts.map((a) => ({ id: a.id, name: a.name }))} />;
}
