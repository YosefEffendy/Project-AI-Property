"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PublicNavigation from "./PublicNavigation";
import { loadPropertyDetail } from "@/lib/property-detail";
import { formatPrice, formatDistrict, listingLabel, pricePerSqft as calculatePsf } from "@/lib/marketplace";
import { useModal } from "@/lib/use-modal";
import { createClient } from "@/lib/supabase";

type PropertyImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
};

type Property = {
  id: string;
  title: string | null;
  listing_type: string | null;
  property_type: string | null;
  address: string | null;
  district: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  description: string | null;
  status: string | null;
  agent_id: string;
};

type Agent = {
  id?: string;
  full_name: string | null;
  agency_name: string | null;
  phone: string | null;
};

export default function PropertyDetail({ ownerPreview = false }: { ownerPreview?: boolean }) {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const supabase = useMemo(() => createClient(), []);

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryType, setEnquiryType] = useState<
    "General Enquiry" | "Schedule Viewing"
  >("General Enquiry");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerMessage, setBuyerMessage] = useState("");
  const [minimumViewingAt, setMinimumViewingAt] = useState("");
  const [preferredViewingAt, setPreferredViewingAt] = useState("");
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  const enquiryRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  useModal(enquiryOpen, enquiryRef, () => { if (!enquirySubmitting) setEnquiryOpen(false); });
  useModal(showAllPhotos, galleryRef, () => setShowAllPhotos(false));

  useEffect(() => {
    let cancelled = false;
    async function loadProperty() {
      setLoading(true);
      setNotFound(false);
      setProperty(null);
      setAgent(null);
      setImages([]);
      try {
        const { data: propertyData, error: propertyError } = await loadPropertyDetail(supabase, id, ownerPreview);
        if (cancelled) return;
        if (propertyError || !propertyData) {
          setNotFound(true);
          return;
        }
        const [imageResult, agentResult] = await Promise.all([
          supabase.from("property_images")
            .select("id,image_url,is_cover,display_order")
            .eq("property_id", id)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase.from("public_agent_profiles")
            .select("id,full_name,agency_name,phone")
            .eq("id", propertyData.agent_id).maybeSingle(),
        ]);
        if (cancelled) return;
        setProperty(propertyData as Property);
        const loadedImages = (imageResult.data ?? []) as PropertyImage[];
        setImages(loadedImages);
        setSelectedImageIndex(Math.max(0, loadedImages.findIndex(image => image.is_cover)));
        setAgent(agentResult.data as Agent | null);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProperty();
    // Recheck owner access on sign-out/account changes, including in other tabs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (ownerPreview && (event === "SIGNED_OUT" || event === "SIGNED_IN")) {
        cancelled = true;
        setProperty(null);
        setEnquiryOpen(false);
        setShowAllPhotos(false);
        router.refresh();
      }
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [id, supabase, ownerPreview, router]);

  function previousImage() {
    if (images.length <= 1) return;

    setSelectedImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function nextImage() {
    if (images.length <= 1) return;

    setSelectedImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  function getAgentInitials() {
    const name = agent?.full_name?.trim();

    if (!name) {
      return "A";
    }

    const parts = name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  function openEnquiry(
    type: "General Enquiry" | "Schedule Viewing"
  ) {
    if (ownerPreview) return;
    setMinimumViewingAt(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setEnquiryType(type);
    setEnquiryError("");
    setEnquirySuccess(false);
    setPreferredViewingAt("");
    setEnquiryOpen(true);
  }

  function closeEnquiry() {
    if (enquirySubmitting) return;
    setEnquiryOpen(false);
    setEnquiryError("");
    setEnquirySuccess(false);
  }

  async function submitEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ownerPreview || !property || property.status !== "Active" || !property.agent_id) {
      setEnquiryError("This listing is not ready to receive enquiries.");
      return;
    }

    const name = buyerName.trim();
    const phone = buyerPhone.trim();
    const email = buyerEmail.trim();
    const message = buyerMessage.trim();

    if (name.length < 2) {
      setEnquiryError("Please enter your name.");
      return;
    }

    if (phone.length < 6) {
      setEnquiryError("Please enter a valid phone number.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEnquiryError("Please enter a valid email address or leave it blank.");
      return;
    }

    if (enquiryType === "Schedule Viewing" && !preferredViewingAt) {
      setEnquiryError("Please choose your preferred viewing date and time.");
      return;
    }

    const viewingDate = enquiryType === "Schedule Viewing"
      ? new Date(`${preferredViewingAt}:00+08:00`) : null;
    if (viewingDate && (!Number.isFinite(viewingDate.getTime()) || viewingDate.getTime() <= Date.now())) {
      setEnquiryError("Please choose a future viewing time in Singapore time.");
      return;
    }

    setEnquirySubmitting(true);
    setEnquiryError("");

    const { error } = await supabase.from("enquiries").insert({
      property_id: property.id,
      agent_id: property.agent_id,
      enquiry_type: enquiryType,
      buyer_name: name,
      buyer_phone: phone,
      buyer_email: email || null,
      message: message || null,
      source: "Property Detail",
      status: "New",
      preferred_viewing_at: viewingDate?.toISOString() ?? null,
    });

    setEnquirySubmitting(false);

    if (error) {
      console.error("Error submitting enquiry:", error);
      setEnquiryError(
        "We could not send your enquiry. Please check your details and try again."
      );
      return;
    }

    setEnquirySuccess(true);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading property...
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !property) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            ⌂
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">
            Property not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            This property may no longer exist or the listing link may
            be incorrect.
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const selectedImage =
    images[selectedImageIndex] || images[0] || null;

  const pricePerSqft = calculatePsf(property.price, property.size_sqft, property.listing_type);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVIGATION */}

      <PublicNavigation />
      {ownerPreview && <div role="status" className="bg-amber-50 px-4 py-4 text-center text-sm text-amber-900">Owner preview · {property.status}. Enquiries are disabled in preview. <Link href={`/agent/listings/${id}`} className="font-semibold underline">Back to Manage Listing</Link></div>}


      {/* PAGE CONTENT */}

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-7 lg:px-8">
        {/* BREADCRUMB / BACK */}

        <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back
          </button>

          <div className="hidden min-w-0 items-center text-sm text-slate-400 sm:flex">
            <a
              href="/search"
              className="shrink-0 hover:text-slate-900"
            >
              Property Search
            </a>

            <span className="mx-2">/</span>

            <span className="truncate">
              {property.title || "Property"}
            </span>
          </div>
        </div>

        {/* PROPERTY HEADER */}

        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                  {listingLabel(property.listing_type)}
                </span>

                {property.property_type && (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {property.property_type}
                  </span>
                )}

                {property.status && (
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                    {property.status}
                  </span>
                )}
              </div>

              <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {property.title || "Untitled Property"}
              </h1>

              <p className="mt-3 break-words text-base leading-7 text-slate-500 sm:text-lg">
                {property.address || "Address not provided"}

                {property.district
                  ? ` · ${formatDistrict(property.district)}`
                  : ""}
              </p>
            </div>

            <div className="shrink-0 lg:text-right">
              <div className="text-3xl font-bold tracking-tight sm:text-4xl">
                {formatPrice(property.price, property.listing_type)}
              </div>

              {pricePerSqft !== null && (
                <div className="mt-1.5 text-sm font-medium text-slate-500">
                  $
                  {pricePerSqft.toLocaleString("en-SG")} psf
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RESPONSIVE PHOTO GALLERY */}

        <section>
          {selectedImage ? (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-slate-200 shadow-sm sm:rounded-3xl">
                <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1]">
                  <img
                    src={selectedImage.image_url}
                    alt={
                      property.title
                        ? `${property.title} property photo`
                        : "Property photo"
                    }
                    className="h-full w-full object-cover"
                  />
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousImage}
                      aria-label="Previous property photo"
                      className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-semibold text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white sm:left-5 sm:h-12 sm:w-12"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Next property photo"
                      className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-2xl font-semibold text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white sm:right-5 sm:h-12 sm:w-12"
                    >
                      ›
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAllPhotos(true)}
                      className="absolute right-3 top-3 min-h-11 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-md transition hover:bg-white sm:right-5 sm:top-5 sm:px-4 sm:text-sm"
                    >
                      View all photos
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur sm:bottom-5 sm:right-5 sm:text-sm">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 sm:gap-3">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(index)
                      }
                      className={`relative h-16 min-w-24 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:min-w-28 ${
                        selectedImageIndex === index
                          ? "border-slate-900"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={image.image_url}
                        alt={`Property photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {image.is_cover && (
                        <div className="absolute bottom-1 left-1 rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          COVER
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-center text-sm font-medium text-slate-400 sm:aspect-[16/9] sm:rounded-3xl">
              No property photos have been uploaded.
            </div>
          )}
        </section>

        {/* PROPERTY CONTENT */}

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 xl:gap-12">
          <div className="min-w-0">
            {/* QUICK FACTS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-7">
              <h2 className="text-xl font-bold sm:text-2xl">
                Property details
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-400 sm:text-sm">
                    Bedrooms
                  </div>

                  <div className="mt-1.5 text-xl font-bold">
                    {property.bedrooms ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-400 sm:text-sm">
                    Bathrooms
                  </div>

                  <div className="mt-1.5 text-xl font-bold">
                    {property.bathrooms ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-400 sm:text-sm">
                    Floor area
                  </div>

                  <div className="mt-1.5 break-words text-lg font-bold sm:text-xl">
                    {property.size_sqft
                      ? `${property.size_sqft.toLocaleString(
                          "en-SG"
                        )} sqft`
                      : "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-400 sm:text-sm">
                    District
                  </div>

                  <div className="mt-1.5 break-words text-lg font-bold sm:text-xl">
                    {property.district
                      ? formatDistrict(property.district)
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
                <div className="flex items-start justify-between gap-5 py-4">
                  <span className="text-sm text-slate-500">
                    Listing type
                  </span>

                  <span className="text-right text-sm font-semibold">
                    {listingLabel(property.listing_type)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-5 py-4">
                  <span className="text-sm text-slate-500">
                    Property type
                  </span>

                  <span className="text-right text-sm font-semibold">
                    {property.property_type || "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-5 py-4">
                  <span className="text-sm text-slate-500">
                    Asking price
                  </span>

                  <span className="text-right text-sm font-semibold">
                    {formatPrice(property.price, property.listing_type)}
                  </span>
                </div>

                {pricePerSqft !== null && (
                  <div className="flex items-start justify-between gap-5 py-4">
                    <span className="text-sm text-slate-500">
                      Price per sqft
                    </span>

                    <span className="text-right text-sm font-semibold">
                      $
                      {pricePerSqft.toLocaleString(
                        "en-SG"
                      )}{" "}
                      psf
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* DESCRIPTION */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-7">
              <h2 className="text-xl font-bold sm:text-2xl">
                About this property
              </h2>

              <div className="mt-5 whitespace-pre-line break-words text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
                {property.description ||
                  "No property description has been added yet."}
              </div>
            </section>

            {/* AI PROPERTY INSIGHTS */}

            <section className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-5 sm:rounded-3xl sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 font-bold text-white">
                  ✦
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-600 sm:text-sm">
                    Project AI
                  </div>

                  <h2 className="mt-0.5 text-xl font-bold sm:text-2xl">
                    AI Property Insights · Coming Soon
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
                AI-powered property analysis will eventually
                compare nearby transactions, asking prices,
                property size, location, MRT access and
                comparable listings.
              </p>

              <div className="mt-5 rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm leading-6 text-slate-500">
                AI insights are coming in a later milestone.
                They are not yet available.
              </div>
            </section>
          </div>

          {/* AGENT SIDEBAR */}

          <aside className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6 lg:sticky lg:top-24">
              <div className="text-sm font-medium text-slate-500">
                Listed by
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
                  {getAgentInitials()}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">
                    {agent?.full_name ||
                      "Property Agent"}
                  </div>

                  <div className="mt-0.5 truncate text-sm text-slate-500">
                    {agent?.agency_name ||
                      "Agency information unavailable"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={ownerPreview}
                onClick={() => openEnquiry("General Enquiry")}
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white transition hover:bg-slate-800"
              >
                Enquire Now
              </button>

              {agent?.phone && (
                <a
                  href={`tel:${agent.phone}`}
                  className="mt-3 block w-full rounded-xl border border-slate-200 px-5 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Call Agent
                </a>
              )}

              <button
                type="button"
                disabled={ownerPreview}
                onClick={() => openEnquiry("Schedule Viewing")}
                className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Schedule Viewing
              </button>



              <p className="mt-5 text-center text-xs leading-5 text-slate-400">
                Contact the listing agent for viewing
                availability and additional property
                information.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 Project AI. Singapore.</div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/search">Browse properties</Link>
            <Link href="/login">Agent Sign In</Link>
          </div>
        </div>
      </footer>

      {/* MOBILE CONTACT BAR */}

      <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2">
          {agent?.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
            >
              Call
            </a>
          )}

          <button
            type="button"
            disabled={ownerPreview}
                onClick={() => openEnquiry("General Enquiry")}
            className="flex-[1.5] rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            Enquire Now
          </button>
        </div>
      </div>

      {/* ENQUIRY MODAL */}

      {enquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close enquiry form"
            onClick={closeEnquiry}
            className="absolute inset-0"
          />

          <div ref={enquiryRef} role="dialog" aria-modal="true" aria-label={enquiryType} tabIndex={-1} className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7">
            {enquirySuccess ? (
              <div className="py-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
                  ✓
                </div>
                <h2 className="mt-5 text-2xl font-bold">Enquiry sent</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your enquiry for {property.title || "this property"} has been sent to {agent?.full_name || "the listing agent"}.
                </p>
                <button
                  type="button"
                  onClick={closeEnquiry}
                  className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-600">
                      {enquiryType === "Schedule Viewing" ? "Viewing request" : "Property enquiry"}
                    </div>
                    <h2 className="mt-1 text-2xl font-bold">
                      {enquiryType === "Schedule Viewing" ? "Schedule a viewing" : "Enquire about this property"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {property.title || "Property"} · {formatPrice(property.price, property.listing_type)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEnquiry}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={submitEnquiry} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="buyer-name" className="text-sm font-semibold">Name *</label>
                    <input id="buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={100} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-sky-400" placeholder="Your name" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="buyer-phone" className="text-sm font-semibold">Phone *</label>
                      <input id="buyer-phone" type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} maxLength={30} autoComplete="tel" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-sky-400" placeholder="e.g. 9123 4567" />
                    </div>
                    <div>
                      <label htmlFor="buyer-email" className="text-sm font-semibold">Email</label>
                      <input id="buyer-email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} maxLength={254} autoComplete="email" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-sky-400" placeholder="Optional" />
                    </div>
                  </div>

                  {enquiryType === "Schedule Viewing" && (
                    <div>
                      <label htmlFor="viewing-time" className="text-sm font-semibold">Preferred date & time (Singapore) *</label>
                      <input id="viewing-time" type="datetime-local" value={preferredViewingAt} onChange={(e) => setPreferredViewingAt(e.target.value)} min={minimumViewingAt} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-sky-400" />
                    </div>
                  )}

                  <div>
                    <label htmlFor="buyer-message" className="text-sm font-semibold">Message</label>
                    <textarea id="buyer-message" value={buyerMessage} onChange={(e) => setBuyerMessage(e.target.value)} maxLength={3000} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400" placeholder={enquiryType === "Schedule Viewing" ? "Any timing or viewing notes for the agent?" : "Hi, I'm interested in this property. Please contact me with more information."} />
                  </div>

                  {enquiryError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {enquiryError}
                    </div>
                  )}

                  <p className="text-xs leading-5 text-slate-400">
                    By submitting, you agree that your contact details may be shared with the listing agent so they can respond to this enquiry.
                  </p>

                  <button type="submit" disabled={enquirySubmitting} className="min-h-12 w-full rounded-xl bg-slate-900 px-5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {enquirySubmitting ? "Sending..." : enquiryType === "Schedule Viewing" ? "Request viewing" : "Send enquiry"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ALL PHOTOS MODAL */}

      {showAllPhotos && (
        <div ref={galleryRef} role="dialog" aria-modal="true" aria-label="Property photos" tabIndex={-1} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95">
          <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-6xl">
              <div className="sticky top-3 z-10 mb-5 flex items-center justify-between rounded-2xl bg-slate-900/90 px-4 py-3 text-white backdrop-blur sm:px-5">
                <div className="font-semibold">
                  {images.length}{" "}
                  {images.length === 1
                    ? "Photo"
                    : "Photos"}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAllPhotos(false)
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl font-bold transition hover:bg-white/20"
                  aria-label="Close photo gallery"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowAllPhotos(false);
                    }}
                    className="overflow-hidden rounded-2xl bg-slate-900"
                  >
                    <img
                      src={image.image_url}
                      alt={`Property photo ${index + 1}`}
                      className="h-auto w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}