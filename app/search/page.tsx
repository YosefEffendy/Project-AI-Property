import { Suspense } from "react";
import SearchClient from "./SearchClient";

function SearchLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden h-96 animate-pulse rounded-2xl bg-white lg:block" />

          <div>
            <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />

            <div className="mt-6 space-y-5">
              <div className="h-56 animate-pulse rounded-2xl bg-white" />
              <div className="h-56 animate-pulse rounded-2xl bg-white" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchClient />
    </Suspense>
  );
}