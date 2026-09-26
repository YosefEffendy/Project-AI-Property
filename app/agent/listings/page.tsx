"use client";

import Link from "next/link";
import AgentNavigation from "@/app/components/AgentNavigation";
import { useState } from "react";
import { useAgentOverview } from "@/lib/use-agent-overview";

export default function MyListings() {
  const { listings, agentName, totalEnquiries, listingsAvailable, loading, signInRequired, error, refresh } = useAgentOverview();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const totalListings = listings.length;
  const activeListings = listings.filter((listing) => listing.status === "Active").length;
  const visibleListings = listings.filter((listing) =>
    (filter === "All" || listing.status === filter) &&
    (listing.name.toLowerCase().includes(search.toLowerCase()) || listing.location.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading your listings...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">

          <Link href="/agent/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
              P
            </div>

            <div>
              <div className="break-words text-xl font-bold">
                Project AI
              </div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Agent Portal
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">

            <Link
              href="/search"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              View Marketplace
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
              {agentName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>

          </div>

        </div>
      </nav>


      <AgentNavigation currentPath="/agent/listings" mobile />

      {/* PAGE */}
      <div className="mx-auto flex max-w-7xl">

        {/* SIDEBAR */}
        <aside className="hidden min-h-[calc(100vh-81px)] w-56 shrink-0 border-r border-slate-200 bg-white p-5 md:block">

          <div className="mb-6 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>

          <AgentNavigation currentPath="/agent/listings" />

          {/* AI TOOLS */}
          <div className="mb-3 mt-10 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            ✦ AI Tools
          </div>

          <nav className="space-y-1">

            <span className="block px-4 py-3 text-sm text-slate-400">AI Listing Studio · Soon</span>

            <span className="block px-4 py-3 text-sm text-slate-400">AI Listing Writer · Soon</span>

            <span className="block px-4 py-3 text-sm text-slate-400">AI Marketing · Soon</span>

            <span className="block px-4 py-3 text-sm text-slate-400">AI Agent Copilot · Soon</span>

          </nav>

        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1 p-4 sm:p-6 md:p-10">

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button onClick={refresh} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Refresh</button>
            {loading && <span role="status" className="text-sm text-slate-500">Loading your workspace…</span>}
            {signInRequired && <Link href="/login" className="text-sm font-semibold text-sky-700">Sign in to view your workspace</Link>}
          </div>
          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          {/* TITLE */}
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <div className="text-sm font-semibold text-sky-600">
                PROPERTY MANAGEMENT
              </div>

              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                My Listings
              </h1>

              <p className="mt-2 text-slate-500">
                Manage your properties, enquiries and listing performance.
              </p>

            </div>

            <Link
              href="/agent/add-listing"
              className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white"
            >
              + Add New Listing
            </Link>

          </div>

          {/* SUMMARY */}
          <div className="mt-8 grid gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-6">

              <div className="text-sm text-slate-400">
                Total Listings
              </div>

              <div className="mt-2 text-3xl font-bold">
                {!listingsAvailable ? "—" : totalListings}
              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">

              <div className="text-sm text-slate-400">
                Active Listings
              </div>

              <div className="mt-2 text-3xl font-bold">
                {!listingsAvailable ? "—" : activeListings}
              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">

              <div className="text-sm text-slate-400">
                Total Enquiries
              </div>

              <div className="mt-2 text-3xl font-bold">
                {totalEnquiries ?? "—"}
              </div>

            </div>

          </div>

          {/* FILTER BAR */}
          <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">

            <div className="flex flex-wrap gap-2">

              <button
  onClick={() => setFilter("All")}
  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
    filter === "All"
      ? "bg-slate-900 text-white"
      : "text-slate-500 hover:bg-slate-50"
  }`}
>
  All
</button>

              <button
  onClick={() => setFilter("Active")}
  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
    filter === "Active"
      ? "bg-slate-900 text-white"
      : "text-slate-500 hover:bg-slate-50"
  }`}
>
  Active
</button>

              <button
  onClick={() => setFilter("Draft")}
  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
    filter === "Draft"
      ? "bg-slate-900 text-white"
      : "text-slate-500 hover:bg-slate-50"
  }`}
>
  Draft
</button>

            </div>

            <input
  type="text"
  placeholder="Search listings..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-400"
/>

          </div>

          {/* LISTINGS */}
          <div className="mt-5 space-y-4">

         {!error && !signInRequired && visibleListings.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">{listings.length === 0 ? "No listings yet. Add your first property to get started." : "No listings match your filters."}</p>}
         {visibleListings
  .map((listing) => (

              <div
                key={listing.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center">

                  {/* IMAGE */}
                  <div className="h-36 w-full rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 lg:w-52" />

                  {/* DETAILS */}
                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h2 className="break-words text-xl font-bold">
                          {listing.name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {listing.location}
                        </p>

                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          listing.status === "Active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {listing.status}
                      </div>

                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">

                      <div>
                        <div className="text-lg font-bold">
                          {listing.price}
                        </div>

                        <div className="text-xs text-slate-400">
                          Asking price
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold">
                          {listing.details}
                        </div>

                        <div className="text-xs text-slate-400">
                          Property details
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* PERFORMANCE */}
                  <div className="flex gap-8 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">

                    <div>
                      <div className="break-words text-xl font-bold">
                        {listing.enquiries ?? "—"}
                      </div>

                      <div className="text-xs text-slate-400">
                        Enquiries
                      </div>
                    </div>

                  </div>

                                    <Link
                    href={`/agent/listings/${listing.id}`}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage
                  </Link>

                </div>

              </div>

            ))}

          </div>

        </section>

      </div>

    </main>
  );
}