"use client";
import { ErrorState } from "@/components/ui/states";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-6">
      <div className="w-full max-w-md"><ErrorState title="Something didn't work" description="What happened: the page hit an unexpected error. Why: usually a temporary data issue. What to do: retry, or go back to your overview." onRetry={reset} /></div>
    </div>
  );
}
