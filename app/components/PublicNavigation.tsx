import Link from "next/link";

export default function PublicNavigation() {
  return <nav aria-label="Marketplace navigation" className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="flex min-h-12 items-center gap-3 font-bold text-slate-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">P</span>
        <span className="text-xl">Project AI</span>
      </Link>
      <Link href="/login" className="inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Agent Sign In</Link>
      <div className="flex w-full flex-wrap items-center gap-x-6 text-sm font-semibold sm:order-none sm:w-auto">
        <Link href="/search" className="inline-flex min-h-12 items-center">Browse Properties</Link>
        <Link href="/search?listing_type=Sale" className="inline-flex min-h-12 items-center">Buy</Link>
        <Link href="/search?listing_type=Rent" className="inline-flex min-h-12 items-center">Rent</Link>
      </div>
    </div>
  </nav>;
}
