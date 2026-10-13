import { getCurrentUser } from "@/lib/data";
import { OnboardingWizard } from "@/components/views/onboarding";
export const dynamic = "force-dynamic";
export const metadata = { title: "Build your Financial Twin" };
export default async function Page() {
  const user = await getCurrentUser();
  return <OnboardingWizard initialName={user.name} initialCurrency={user.currency} />;
}
