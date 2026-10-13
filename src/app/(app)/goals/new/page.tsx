import { getCurrentUser } from "@/lib/data";
import { GoalForm } from "@/components/views/goals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Goal" };

export default async function NewGoalPage() {
  const user = await getCurrentUser();
  return <GoalForm currency={user.currency} />;
}
