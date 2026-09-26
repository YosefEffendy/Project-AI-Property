"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type PropertyRow = {
  id: string;
  title: string | null;
  address: string | null;
  district: string | null;
  price: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  status: string | null;
  created_at: string;
};
type EnquiryRow = { id: string; property_id: string | null; status: string | null };
export type AgentListing = {
  id: string;
  name: string;
  location: string;
  price: string;
  details: string;
  status: string;
  enquiries: number | null;
};
type Overview = {
  loading: boolean;
  signInRequired: boolean;
  agentName: string;
  listings: AgentListing[];
  totalEnquiries: number | null;
  newLeads: number | null;
  listingsAvailable: boolean;
  error: string;
};
const EMPTY: Overview = {
  loading: true, signInRequired: false, agentName: "Agent", listings: [],
  totalEnquiries: null, newLeads: null, listingsAvailable: false, error: "",
};

// Read every page, including when the server caps responses below our page size.
// Enquiry reads deliberately exclude buyer contact details and messages.
async function readPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: unknown;
}>, isCurrent: () => boolean): Promise<T[]> {
  const rows: T[] = [];
  while (isCurrent()) {
    const result = await fetchPage(rows.length, rows.length + 499);
    if (result.error) throw result.error;
    if (!result.data?.length) return rows;
    rows.push(...result.data);
  }
  return [];
}

export function useAgentOverview() {
  const supabase = useMemo(() => createClient(), []);
  const [overview, setOverview] = useState<Overview>(EMPTY);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let owner: string | null | undefined;

    async function load() {
      const request = ++generation;
      const current = () => !disposed && request === generation;
      setOverview(EMPTY);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!current()) return;
        owner = user?.id ?? null;
        if (!user) {
          setOverview({ ...EMPTY, loading: false, signInRequired: true });
          return;
        }
        if (error) throw error;
        const [propertyResult, enquiryResult, profileResult] = await Promise.allSettled([
          readPages<PropertyRow>((from, to) => supabase.from("properties")
            .select("id, title, address, district, price, bedrooms, bathrooms, size_sqft, status, created_at")
            .eq("agent_id", user.id).order("created_at", { ascending: false })
            .order("id", { ascending: false }).range(from, to), current),
          readPages<EnquiryRow>((from, to) => supabase.from("enquiries")
            .select("id, property_id, status").eq("agent_id", user.id)
            .order("id", { ascending: true }).range(from, to), current),
          supabase.from("agents").select("full_name").eq("id", user.id).maybeSingle(),
        ]);
        if (!current()) return;
        if (propertyResult.status === "rejected") throw propertyResult.reason;
        const enquiries = enquiryResult.status === "fulfilled" ? enquiryResult.value : null;
        const counts = new Map<string, number>();
        for (const enquiry of enquiries ?? []) {
          if (enquiry.property_id) counts.set(enquiry.property_id, (counts.get(enquiry.property_id) ?? 0) + 1);
        }
        const profile = profileResult.status === "fulfilled" && !profileResult.value.error
          ? profileResult.value.data : null;
        const listings = propertyResult.value.map((property): AgentListing => ({
          id: property.id,
          name: property.title || "Untitled Property",
          location: [property.address, property.district ? `District ${property.district.replace(/^district\s*/i, "").trim().padStart(2, "0")}` : null].filter(Boolean).join(" · "),
          price: property.price === null ? "Price not set" : `$${new Intl.NumberFormat("en-SG", {
            maximumFractionDigits: 0,
          }).format(Number(property.price))}`,
          details: `${property.bedrooms ?? 0} Beds · ${property.bathrooms ?? 0} Baths · ${property.size_sqft ?? 0} sqft`,
          status: property.status || "Draft",
          enquiries: enquiries === null ? null : counts.get(property.id) ?? 0,
        }));
        setOverview({ loading: false, signInRequired: false,
          agentName: profile?.full_name || "Agent", listings,
          totalEnquiries: enquiries?.length ?? null,
          newLeads: enquiries?.filter((enquiry) => enquiry.status === "New").length ?? null,
          listingsAvailable: true,
          error: enquiries === null ? "Enquiry counts could not be loaded. Refresh to try again; unavailable counts are shown as —." : "",
        });
      } catch {
        if (current()) setOverview({ ...EMPTY, loading: false,
          error: "Your workspace could not be loaded. Refresh to try again.",
        });
      }
    }

    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (owner !== undefined && (session?.user.id ?? null) !== owner) {
        owner = session?.user.id ?? null;
        ++generation;
        setOverview(EMPTY);
        queueMicrotask(() => { if (!disposed) void load(); });
      }
    });
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { disposed = true; ++generation; subscription.unsubscribe(); window.removeEventListener("focus", onFocus); };
  }, [supabase, revision]);

  return { ...overview, refresh };
}
