import { getCurrentUser, getTwin } from "@/lib/data";
import { CompleteScene } from "@/components/views/onboarding";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your Twin is ready" };
export default async function Page() {
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  return <CompleteScene name={user.name} netWorth={twin.metrics.netWorth} currency={user.currency} />;
}
