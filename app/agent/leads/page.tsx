"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const STATUSES = ["New", "Contacted", "Viewing", "Negotiating", "Closed", "Lost"] as const;
type LeadStatus = (typeof STATUSES)[number];
type Lead = {
  id: string;
  property_id: string;
  agent_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  message: string | null;
  enquiry_type: string;
  status: string;
  created_at: string;
  preferred_viewing_at: string | null;
};
type Property = { id: string; title: string | null; address: string | null };
const NAV = [
  ["Dashboard", "/agent/dashboard"],
  ["Listings", "/agent/listings"],
  ["Add Listing", "/agent/add-listing"],
  ["Leads", "/agent/leads"],
] as const;
const PAGE_SIZE = 50;
const leadColumns = "id, property_id, agent_id, buyer_name, buyer_phone, buyer_email, message, enquiry_type, status, created_at, preferred_viewing_at";

function singaporeDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore",
  }).format(date);
}

export default function AgentLeadsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signInRequired, setSignInRequired] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const updateLock = useRef(false);
  const ownerId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      setNotice("");
      setLeads([]);
      setProperties({});
      setCounts({});
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        ownerId.current = user?.id ?? null;
        setSignInRequired(!user);
        if (!user) return;
        if (authError) throw authError;

        let query = supabase.from("enquiries").select(leadColumns)
          .eq("agent_id", user.id);
        if (filter !== "All") query = query.eq("status", filter);
        const [leadResult, totals] = await Promise.all([
          query.order("created_at", { ascending: false }).order("id", { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
          Promise.all(["All", ...STATUSES].map(async (status) => {
            let countQuery = supabase.from("enquiries")
              .select("id", { count: "exact", head: true }).eq("agent_id", user.id);
            if (status !== "All") countQuery = countQuery.eq("status", status);
            const result = await countQuery;
            if (result.error) throw result.error;
            return [status, result.count ?? 0] as const;
          })),
        ]);
        if (leadResult.error) throw leadResult.error;
        const loaded = (leadResult.data ?? []) as Lead[];
        const ids = [...new Set(loaded.map((lead) => lead.property_id).filter(Boolean))];
        let propertyRows: Property[] = [];
        if (ids.length) {
          const result = await supabase.from("properties").select("id, title, address")
            .eq("agent_id", user.id).in("id", ids);
          if (result.error) throw result.error;
          propertyRows = result.data ?? [];
        }
        if (!cancelled) {
          setLeads(loaded);
          setCounts(Object.fromEntries(totals));
          setProperties(Object.fromEntries(propertyRows.map((property) => [property.id, property])));
        }
      } catch {
        if (!cancelled) setError("Could not load your enquiries. Please retry. If this continues, check your connection and enquiry access permissions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, filter, page, revision]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if ((session?.user.id ?? null) !== ownerId.current) {
        ownerId.current = session?.user.id ?? null;
        setLeads([]);
        setProperties({});
        setCounts({});
        setLoading(true);
        setPage(1);
        setRevision((value) => value + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function changeStatus(lead: Lead, status: LeadStatus) {
    if (updateLock.current || status === lead.status || !STATUSES.includes(status)) return;
    updateLock.current = true;
    setSavingId(lead.id);
    setError("");
    setNotice("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== lead.agent_id) throw new Error("Session changed");
      // Returning the updated row detects zero-row updates, including RLS denial.
      // Matching the old status also avoids silently overwriting another tab's change.
      const { data, error: updateError } = await supabase.from("enquiries")
        .update({ status }).eq("id", lead.id).eq("agent_id", user.id)
        .eq("status", lead.status).select("id, status").single();
      if (updateError || !data || data.status !== status) throw new Error("Update not confirmed");
      if (ownerId.current !== user.id) return;
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
      setCounts((current) => ({ ...current,
        [lead.status]: Math.max(0, (current[lead.status] ?? 0) - 1),
        [status]: (current[status] ?? 0) + 1,
      }));
      setNotice(`Status saved as ${status}.`);
      if (filter !== "All") {
        setPage(1);
        setRevision((value) => value + 1);
      }
    } catch {
      setError("Status change could not be confirmed. Refresh to check the latest saved status before trying again.");
    } finally {
      updateLock.current = false;
      setSavingId(null);
    }
  }

  function navigation(mobile: boolean) {
    return <nav aria-label={mobile ? "Mobile agent navigation" : "Agent navigation"}
      className={mobile ? "flex gap-2 overflow-x-auto border-b border-slate-200 bg-white p-3 md:hidden" : "space-y-2"}>
      {NAV.map(([label, href]) => <Link key={href} href={href}
        aria-current={label === "Leads" ? "page" : undefined}
        className={`block shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${label === "Leads" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
        {label}
      </Link>)}
    </nav>;
  }

  const total = counts[filter] ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/agent/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">P</span>
          <span><span className="block text-xl font-bold">Project AI</span><span className="block text-[10px] uppercase tracking-widest text-slate-400">Agent Portal</span></span>
        </Link>
        <Link href="/search" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">View Marketplace</Link>
      </div>
    </header>
    {navigation(true)}
    <div className="mx-auto flex max-w-7xl">
      <aside className="hidden min-h-[calc(100vh-81px)] w-56 shrink-0 border-r border-slate-200 bg-white p-5 md:block">{navigation(false)}</aside>
      <section className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-sky-600">Lead Centre</p>
            <h1 className="mt-2 text-3xl font-bold">Enquiries &amp; Leads</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your property enquiries and viewing requests. All times are Singapore time (SGT).</p></div>
          <button disabled={loading || savingId !== null} onClick={() => setRevision((value) => value + 1)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50">Refresh</button>
        </div>
        {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        {loading ? <p role="status" className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Loading your enquiries…</p>
          : signInRequired ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Sign in to view your leads</h2><p className="mt-2 text-sm text-slate-500">Use your agent account, then return to the Lead Centre.</p><Link href="/login" className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Agent sign in</Link></div>
          : <>
            <div className="mt-7 flex flex-wrap gap-2" aria-label="Filter enquiries by status">
              {["All", ...STATUSES].map((status) => <button key={status} aria-pressed={filter === status} disabled={savingId !== null}
                onClick={() => { setFilter(status); setPage(1); }}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${filter === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                {status} <span className="ml-2">{counts[status] ?? "—"}</span>
              </button>)}
            </div>
            {!error && leads.length === 0 && <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">{filter === "All" ? "No enquiries yet. Buyer enquiries for your properties will appear here." : `No ${filter.toLowerCase()} enquiries on this page.`}</p>}
            <div className="mt-6 space-y-5">
              {leads.map((lead) => {
                const property = properties[lead.property_id];
                const phone = lead.buyer_phone?.replace(/[^\d+]/g, "");
                return <article key={lead.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{lead.enquiry_type}</p>
                      <h2 className="mt-2 break-words text-xl font-bold">{lead.buyer_name || "Buyer"}</h2>
                      {property ? <Link href={`/property/${property.id}`} className="mt-2 block break-words font-semibold text-sky-700 hover:underline">{property.title || "Untitled property"}</Link> : <p className="mt-2 text-sm text-slate-500">Property details unavailable</p>}
                      {property?.address && <p className="mt-1 break-words text-sm text-slate-500">{property.address}</p>}
                      <p className="mt-3 text-xs text-slate-500">Received {singaporeDate(lead.created_at)} SGT</p>
                    </div>
                    <div className="w-full lg:w-44 lg:shrink-0">
                      <label htmlFor={`status-${lead.id}`} className="block text-xs font-semibold text-slate-500">Lead status</label>
                      <select id={`status-${lead.id}`} value={lead.status} disabled={savingId !== null}
                        onChange={(event) => void changeStatus(lead, event.target.value as LeadStatus)}
                        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold disabled:opacity-50">
                        {!STATUSES.includes(lead.status as LeadStatus) && <option value={lead.status}>{lead.status}</option>}
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                      {savingId === lead.id && <p role="status" className="mt-2 text-xs text-slate-500">Saving status…</p>}
                    </div>
                  </div>
                  {lead.preferred_viewing_at && <p className="mt-5 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Preferred viewing: {singaporeDate(lead.preferred_viewing_at)} SGT</p>}
                  {lead.message && <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{lead.message}</p>}
                  <div className="mt-5 flex flex-wrap gap-3 text-sm">
                    {phone && <a href={`tel:${phone}`} className="max-w-full break-all rounded-xl border border-slate-200 px-4 py-3 font-semibold">Call buyer · {lead.buyer_phone}</a>}
                    {lead.buyer_email && <a href={`mailto:${lead.buyer_email}`} className="max-w-full break-all rounded-xl border border-slate-200 px-4 py-3 font-semibold">{lead.buyer_email}</a>}
                  </div>
                </article>;
              })}
            </div>
            {total > PAGE_SIZE && <nav aria-label="Lead pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button disabled={page <= 1 || savingId !== null} onClick={() => setPage((value) => value - 1)} className="rounded-xl border bg-white px-4 py-3 disabled:opacity-40">Previous</button>
              <span>Page {page} of {totalPages} · {total} enquiries</span>
              <button disabled={page >= totalPages || savingId !== null} onClick={() => setPage((value) => value + 1)} className="rounded-xl border bg-white px-4 py-3 disabled:opacity-40">Next</button>
            </nav>}
          </>}
      </section>
    </div>
  </main>;
}
