import { getCurrentUser } from "@/lib/data";
import { ProfileView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };
export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const u = await getCurrentUser();
  return <ProfileView edit={edit === "1"} user={{ name: u.name, email: u.email, age: u.age, country: u.country, city: u.city, currency: u.currency, employment: u.employment, planningStyle: u.planningStyle, emailVerified: u.emailVerified, createdAt: u.createdAt.toISOString(), settings: (u.settings as Record<string, unknown>) ?? {} }} />;
}
