import { Suspense } from "react";
import { getAiMessages, getCurrentUser, getScenarios, getTwin } from "@/lib/data";
import { AiView } from "@/components/views/ai";
import type { AiAnswer } from "@/lib/intelligence";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Financial Intelligence" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  const [twin, messages, scenarios] = await Promise.all([getTwin(user), getAiMessages(user.id), getScenarios(user.id)]);
  const g = twin.goals[0];
  const active = scenarios.find((s) => s.lastRunAt) ?? null;
  return (
    <Suspense>
      <AiView
        currency={user.currency}
        userName={user.name}
        metrics={twin.metrics}
        emergencySavings={twin.input.emergencySavings}
        goal={g ? { id: g.id, name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount } : null}
        activeScenario={active ? { id: active.id, name: active.name } : null}
        history={messages.map((m) => ({ id: String(m.id), role: m.role as "user" | "assistant", content: m.content, meta: (m.meta as unknown as AiAnswer | null) ?? null }))}
        initialQuestion={q}
      />
    </Suspense>
  );
}
