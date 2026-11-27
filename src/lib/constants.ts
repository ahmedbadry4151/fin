export const DEMO_EMAIL = "demo@fintwin.app";
export const DEMO_PASSWORD = "fintwin123";

// Domain bound for a single transaction. Kept in lib/ so UI and engine agree on one figure.
export const MAX_TRANSACTION_AMOUNT = 1_000_000_000;

// Demo fallback used when the user is unsure about income.
export const DEFAULT_UNSURE_MONTHLY_INCOME = 25_000;

// Stable "now" captured once when the client bundle loads. The demo store resets
// on reload, so a session-start reference keeps render pure (no Date.now in render).
export const APP_BOOT_TIME = Date.now();
