 ### Root Cause Analysis

  The hydration mismatch occurred due to how Framer Motion handles initial,
  animate, and useReducedMotion() during Server-Side Rendering (SSR) vs. Client
  Hydration:

  1. useReducedMotion() SSR vs Client Mismatch:
      • On the server during SSR, useReducedMotion() returns null (falsy) because
      window.matchMedia is unavailable.
      • On the client, if the user or device has prefers-reduced-motion enabled,
      useReducedMotion() returns true.
  2. Divergent Initial Style Calculation:
      • Previously, the element was configured as:
        initial={reduce ? false : { width: 0 }}

      • On the server (reduce = null), initial evaluated to { width: 0 }, causing
      Framer Motion to serialize the inline style in pixels: style="...;width:0px".
      • On the client (reduce = true), initial evaluated to false. When
      initial={false}, Framer Motion skips initial animation styles and immediately
      renders the values from animate={{ width: ${(Math.abs(r.value) / max) * 100}%
      }} into the element's style during initial client render (e.g., width: "87.
      02167186792981%").
      • This caused React 19's hydration diff:
          • Server rendered: style={{ width: "0px" }}
          • Client rendered: style={{ background: "var(--accent)", width: "87.
          02167186792981%" }}


  ──────
  ### Solution

  In src/components/charts/charts.tsx/src/components/charts/charts.tsx#L98-L106),
  we updated the <motion.div> in HBars:

    <div className="h-2 w-full overflow-hidden pill bg-card3">
      <motion.div
        className="h-full pill"
        style={{ background: color[r.tone ?? "ink"] }}
        initial={{ width: "0%" }}
        animate={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE_OUT,
        delay: i * 0.05 }}
      />
    </div>

  ### Key Changes & Verification

  1. Consistent Initial Units (width: "0%"):
      • Both server and client now consistently render style="background:...;
      width:0%", matching the percentage units used in animate.
  2. Accessible Motion via Transition:
      • Instead of setting initial={false} (which alters DOM styles during
      hydration), reduced motion is handled via transition={reduce ? { duration: 0
      } : { duration: 0.7, ease: EASE_OUT, delay: i * 0.05 }}. Framer Motion
      transitions with duration 0 without creating mismatched DOM attributes during
      hydration.
  3. Verification:
      • Tested SSR and client hydration across reduce = null, false, and true: all
      produce identical initial HTML <div class="h-full pill"
      style="background:var(--accent);width:0%"></div>.
      • TypeScript checks completed cleanly with zero errors.
