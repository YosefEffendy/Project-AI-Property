import Link from "next/link";
import PublicNavigation from "./components/PublicNavigation";
import HomeMarketplace from "./components/HomeMarketplace";

export default function Home() {
  return <main className="min-h-screen bg-white text-slate-900">
    <PublicNavigation />
    <HomeMarketplace />
    <section className="bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl"><h2 className="text-2xl font-bold">Are you a property agent?</h2>
        <p className="mt-3 text-slate-600">Sign in to manage your listings, photos and buyer enquiries.</p>
        <Link href="/login" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-slate-900 px-5 font-semibold text-white">Agent Sign In</Link>
      </div>
    </section>
    <footer className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500 sm:px-6"><div className="mx-auto max-w-7xl">© 2026 Project AI. Singapore.</div></footer>
  </main>;
}
