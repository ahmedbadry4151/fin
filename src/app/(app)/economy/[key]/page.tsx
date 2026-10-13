import { notFound } from "next/navigation";
import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { assumptionDef } from "@/lib/economy";
import { AssumptionDetailView } from "@/components/views/economy";
export const dynamic = "force-dynamic";
export const metadata = { title: "Assumption" };
export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = assumptionDef(key);
  if (!def) notFound();
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  return <AssumptionDetailView currency={user.currency} def={def} value={twin.econ[def.key]} simTwin={buildSimTwin(twin.input, null)} econ={twin.econ} />;
}
