import { Suspense } from "react";
import { getCurrentUser, getScenarios, getSimulations, getTwin } from "@/lib/data";
import { ReportBuilder } from "@/components/views/reports";
export const dynamic = "force-dynamic";
export const metadata = { title: "Report Builder" };
export default async function Page() {
  const user = await getCurrentUser();
  const [twin, scenarios, sims] = await Promise.all([getTwin(user), getScenarios(user.id), getSimulations(user.id, 30)]);
  return (
    <Suspense>
      <ReportBuilder scenarios={scenarios.map((s) => ({ id: s.id, name: s.name }))} goals={twin.goals.map((g) => ({ id: g.id, name: g.name }))} simulations={sims.map((s) => ({ id: s.id, name: s.name }))} />
    </Suspense>
  );
}
