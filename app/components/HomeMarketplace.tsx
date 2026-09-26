"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { searchProperties } from "@/lib/property-search";
import { RESIDENTIAL_TYPES } from "@/lib/marketplace";
import PropertyCard, { type PropertyCardData } from "./PropertyCard";

export default function HomeMarketplace() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState("Sale");
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    searchProperties(supabase, { sort: "newest" }, 3)
      .then(result => { if (!cancelled) setProperties(result.properties); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supabase]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({ listing_type: mode });
    for (const key of ["q", "property_type", "max_price"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    router.push(`/search?${params.toString()}`);
  }

  const inputStyle = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 focus:outline-sky-500";
  return <>
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-sm font-semibold text-sky-300">Singapore residential properties</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Find your next <span className="text-sky-400">home.</span></h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Explore homes for sale and rent, then contact the listing agent to learn more or request a viewing.</p>
        <form onSubmit={search} className="mt-8 rounded-2xl bg-white p-5 text-slate-900 shadow-xl sm:p-6">
          <fieldset className="flex gap-3">
            <legend className="sr-only">Listing type</legend>
            {["Sale", "Rent"].map(value => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 font-semibold">
              <input type="radio" name="listing_type" value={value} checked={mode === value} onChange={() => setMode(value)} />{value === "Sale" ? "For Sale" : "For Rent"}
            </label>)}
          </fieldset>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_auto] lg:items-end">
            <label className="min-w-0 text-sm font-semibold">Location or keyword<input name="q" placeholder="e.g. Katong or a property name" className={inputStyle} /></label>
            <label className="min-w-0 text-sm font-semibold">Property type<select name="property_type" className={inputStyle}><option value="">All residential types</option>{RESIDENTIAL_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
            <label className="min-w-0 text-sm font-semibold">{mode === "Rent" ? "Maximum rent ($/mo)" : "Maximum price ($)"}<input key={mode} name="max_price" type="number" min="0" step="1" placeholder="No maximum" className={inputStyle} /></label>
            <button type="submit" className="min-h-12 rounded-xl bg-sky-600 px-6 font-semibold text-white hover:bg-sky-700">Search properties</button>
          </div>
          <Link href="/search" className="mt-3 inline-flex min-h-12 items-center text-sm font-semibold text-slate-600 underline">More filters</Link>
        </form>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold sm:text-3xl">Latest properties</h2><p className="mt-2 text-slate-500">Recently added active residential listings.</p></div>
        <Link href="/search" className="inline-flex min-h-12 items-center font-semibold text-sky-700">View all properties →</Link>
      </div>
      <div aria-live="polite">
        {loading ? <p className="py-8 text-slate-500">Loading latest properties…</p> : error ? <p role="alert" className="rounded-xl bg-slate-50 p-6">We could not load the latest properties. <Link href="/search" className="underline">Try browsing properties.</Link></p> : properties.length === 0 ? <p className="rounded-xl bg-slate-50 p-6">No active residential listings yet. Please check back soon.</p> : <div className="space-y-6">{properties.map(property => <PropertyCard key={property.id} property={property} />)}</div>}
      </div>
    </section>
  </>;
}
