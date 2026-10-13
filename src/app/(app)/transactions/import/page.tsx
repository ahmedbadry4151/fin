import { getCurrentUser, getTwin, getTransactions } from "@/lib/data";
import { ImportView } from "@/components/views/import";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import Transactions" };

export default async function ImportPage() {
  const user = await getCurrentUser();
  const [twin, tx] = await Promise.all([getTwin(user), getTransactions(user.id, { limit: 2000 })]);
  return <ImportView currency={user.currency} accounts={twin.accounts.map((a) => ({ id: a.id, name: a.name }))} existingKeys={tx.map((t) => `${t.date}|${t.description.toLowerCase()}|${t.amount}`)} />;
}
