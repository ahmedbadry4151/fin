import { getCurrentUser } from "@/lib/data";
import { AccountForm } from "@/components/views/accounts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Account" };

export default async function NewAccountPage() {
  const user = await getCurrentUser();
  return <AccountForm currency={user.currency} />;
}
