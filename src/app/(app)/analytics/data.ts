import { aggregateByMonth, getCurrentUser, getTransactions, getTwin } from "@/lib/data";

export async function loadAnalytics() {
  const user = await getCurrentUser();
  const [twin, tx] = await Promise.all([getTwin(user), getTransactions(user.id, { limit: 3000 })]);
  const months = aggregateByMonth(tx, 6);
  // Reconstruct liquid history backwards from today's balances.
  const history: { label: string; value: number }[] = [];
  let nw = twin.metrics.netWorth;
  for (let i = months.length - 1; i >= 0; i--) {
    history.unshift({ label: months[i].label, value: Math.round(nw) });
    nw -= months[i].income - months[i].expense;
  }
  return { user, twin, months, history };
}
