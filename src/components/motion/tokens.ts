// Animation tokens shared by Motion components and globals.css.
// Seconds for Motion; the matching --t-* variables are in milliseconds.
// Tiers: micro (immediate feedback), layout (state changes), page (route
// transitions), entrance (choreographed reveals), data (chart/progress).
export const DUR = {
  // micro
  press: 0.18,
  tooltip: 0.14,
  fast: 0.2,
  // layout
  popover: 0.26,
  modal: 0.3,
  // page
  page: 0.42,
  exit: 0.2,
  // entrance choreography
  base: 0.36,
  entrance: 0.46,
  rare: 0.5,
  // sequencing
  stagger: 0.085,
  leadIn: 0.1,
} as const;

// Balanced curves: decelerate on entrance, accelerate on exit,
// symmetric for in-place resizing. CSS mirrors these in globals.css.
export const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;
export const EASE_IN = [0.4, 0, 0.8, 0.4] as const;
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

// Springs with visible but controlled travel (underdamped, no jitter).
export const SPRING = {
  pill: { type: "spring", stiffness: 280, damping: 28 },
  badge: { type: "spring", stiffness: 320, damping: 24 },
  soft: { type: "spring", stiffness: 260, damping: 26 },
} as const;

// Step/tab content leaves toward the side it entered from.
export const STEP = {
  enter: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
} as const;
