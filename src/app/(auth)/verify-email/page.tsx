import { Suspense } from "react";
import { VerifyEmailView } from "@/components/views/auth";
import { getCurrentUser } from "@/lib/data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Verify email" };
export default async function Page() {
  const user = await getCurrentUser();
  return <Suspense><VerifyEmailView email={user.email} /></Suspense>;
}
