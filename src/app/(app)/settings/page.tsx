import { getCurrentUser } from "@/lib/data";
import { SettingsView } from "@/components/views/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };
export default async function Page() {
  const u = await getCurrentUser();
  return <SettingsView user={{ name: u.name, email: u.email, age: u.age, country: u.country, city: u.city, currency: u.currency, employment: u.employment, planningStyle: u.planningStyle, emailVerified: u.emailVerified, createdAt: u.createdAt.toISOString(), settings: (u.settings as Record<string, unknown>) ?? {} }} />;
}
