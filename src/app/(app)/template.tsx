import type { ReactNode } from "react";

// Page transitions live in the persistent (app) layout; the template is a
// pass-through so it does not create a second, competing entrance wrapper.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
