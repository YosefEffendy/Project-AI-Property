"use client";

import Link from "next/link";
import AgentNavigation from "@/app/components/AgentNavigation";
import { useAgentOverview } from "@/lib/use-agent-overview";

export default function AgentDashboard() {
  const { agentName, listings: allListings, totalEnquiries, newLeads, listingsAvailable, loading, signInRequired, error, refresh } = useAgentOverview();
  const listings = allListings.slice(0, 3);
  const activeListings = allListings.filter((listing) => listing.status === "Active").length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* TOP NAVIGATION */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
              P
            </div>

            <div>
              <div className="text-xl font-bold">
                Project AI
              </div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Agent Portal
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">

            <Link href="/search" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">View Marketplace</Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
              {agentName
                .split(" ")
                .map((name) => name[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

          </div>

        </div>
      </nav>


      <AgentNavigation currentPath="/agent/dashboard" mobile />

      {/* DASHBOARD */}
      <div className="mx-auto flex max-w-7xl">

        {/* SIDEBAR */}
        <aside className="hidden min-h-[calc(100vh-81px)] w-56 shrink-0 border-r border-slate-200 bg-white p-5 md:block">

          <div className="mb-6 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </div>

          <AgentNavigation currentPath="/agent/dashboard" />

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

          {/* HEADER */}
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <div className="text-sm font-semibold text-sky-600">
                AGENT DASHBOARD
              </div>

              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                Welcome back, {agentName}
              </h1>

              <p className="mt-2 text-slate-500">
                Your listings and buyer enquiries in one place.
              </p>

            </div>

            <Link href="/agent/add-listing" className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">+ Add New Listing</Link>

          </div>

          {/* STATS */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-400">
                Active Listings
              </div>

              <div className="mt-2 text-3xl font-bold">
                {!listingsAvailable ? "—" : activeListings}
              </div>

              <div className="mt-2 text-sm text-emerald-600">
                Currently active
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-400">
                Enquiries
              </div>

              <div className="mt-2 text-3xl font-bold">
                {totalEnquiries ?? "—"}
              </div>

              <div className="mt-2 text-sm text-emerald-600">
                Across all lead statuses
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-400">
                New Leads
              </div>

              <div className="mt-2 text-3xl font-bold">
                {newLeads ?? "—"}
              </div>

              <div className="mt-2 text-sm text-emerald-600">
                Awaiting first contact
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-400">
                Total Listings
              </div>

              <div className="mt-2 text-3xl font-bold">
                {listingsAvailable ? allListings.length : "—"}
              </div>

              <div className="mt-2 text-sm text-slate-500">
                All listing statuses
              </div>
            </div>

          </div>

          {/* AI FEATURE */}
          <div className="mt-8 overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">

            <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">

              <div>

                <div className="text-sm font-semibold uppercase tracking-wider text-sky-400">
                  ✦ Project AI
                </div>

                <h2 className="mt-2 text-3xl font-bold">
                  Your AI marketing team
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  Create property descriptions, generate marketing content,
                  improve listing photos and virtually stage empty rooms
                  using AI.
                </p>

              </div>

              <button disabled className="whitespace-nowrap rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white opacity-60">
                AI Studio · Coming soon
              </button>

            </div>

          </div>

          {/* LISTINGS */}
          <div className="mt-8">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-2xl font-bold">
                  My Listings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your most recent properties
                </p>
              </div>

              <Link href="/agent/listings" className="text-sm font-semibold text-sky-600">View all →</Link>

            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">

              {!loading && !error && !signInRequired && listings.length === 0 && <p className="p-6 text-sm text-slate-500">No listings yet. Add your first property to get started.</p>}
              {listings.map((listing, index) => (
                <div
                  key={listing.id}
                  className={`flex flex-col justify-between gap-5 p-6 xl:flex-row xl:items-center ${
                    index !== listings.length - 1
                      ? "border-b border-slate-200"
                      : ""
                  }`}
                >

                  <div className="flex min-w-0 items-center gap-5">

                    <div className="h-20 w-28 shrink-0 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400" />

                    <div className="min-w-0">

                      <div className="break-words text-lg font-bold">
                        {listing.name}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {listing.location}
                      </div>

                      <div className="mt-2 font-semibold">
                        {listing.price}
                      </div>

                    </div>

                  </div>

                  <div className="flex flex-wrap items-center gap-6">

                    <div className="text-center">
                      <div className="break-words text-lg font-bold">
                        {listing.enquiries ?? "—"}
                      </div>

                      <div className="text-xs text-slate-400">
                        Enquiries
                      </div>
                    </div>

                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      {listing.status}
                    </div>

                    <Link href={`/agent/listings/${listing.id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Manage</Link>

                  </div>

                </div>
              ))}

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}