import Link from "next/link";
export default function NotFound() {
  return (
    <div className="glow grid min-h-screen place-items-center bg-page px-6 text-center">
      <div>
        <div className="label">404</div>
        <h1 className="mt-2 text-[32px] font-extrabold tracking-tight">This page isn't part of the model.</h1>
        <p className="mt-2 text-[13.5px] text-muted">The link may be outdated, or the item was removed.</p>
        <div className="mt-6 flex justify-center gap-2"><Link href="/overview" className="pill bg-ink px-5 py-2.5 text-[13px] font-semibold text-ink-fg">Go to overview</Link><Link href="/" className="pill bg-card2 px-5 py-2.5 text-[13px] font-semibold">Home</Link></div>
      </div>
    </div>
  );
}
