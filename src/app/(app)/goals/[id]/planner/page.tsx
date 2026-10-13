import { notFound } from "next/navigation";
import { getCurrentUser, getTwin } from "@/lib/data";
import { buildSimTwin } from "@/lib/twin";
import { GoalPlannerView } from "@/components/views/goal-planner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goal Planner" };

export default async function GoalPlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const twin = await getTwin(user);
  const goal = twin.goals.find((g) => g.id === Number(id));
  if (!goal) notFound();
  const simTwin = buildSimTwin(twin.input, null);
  return <GoalPlannerView currency={user.currency} goal={{ ...goal, targetDate: String(goal.targetDate) }} simTwin={simTwin} econ={twin.econ} />;
}
