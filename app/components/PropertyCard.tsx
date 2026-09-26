import Link from "next/link";
import { formatPrice, formatDistrict, listingLabel, pricePerSqft } from "@/lib/marketplace";

export type PropertyCardData = {
  id: string;
  title: string;
  listing_type: string | null;
  property_type: string | null;
  address: string | null;
  district: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  status: string | null;
  cover_image_url: string | null;
  agent_name: string | null;
  agency_name: string | null;
};

type PropertyCardProps = {
  property: PropertyCardData;
};

export default function PropertyCard({
  property,
}: PropertyCardProps) {
  const psf = pricePerSqft(
    property.price,
    property.size_sqft,
    property.listing_type
  );

  const districtLabel = formatDistrict(
    property.district
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid md:grid-cols-[280px_1fr]">
        {/* PROPERTY IMAGE */}
        <Link
          href={`/property/${property.id}`}
          className="relative block min-h-[230px] overflow-hidden bg-slate-200"
          aria-label={`View ${property.title}`}
        >
          {property.cover_image_url ? (
            <img
              src={property.cover_image_url}
              alt={property.title}
              className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300">
              <span className="text-sm font-medium text-slate-500">
                No property photo
              </span>
            </div>
          )}

          {property.listing_type && (
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm">
              {listingLabel(property.listing_type)}
            </span>
          )}

          {property.property_type && (
            <span className="absolute bottom-4 left-4 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
              {property.property_type}
            </span>
          )}
        </Link>

        {/* PROPERTY INFORMATION */}
        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/property/${property.id}`}
                className="text-xl font-bold text-slate-900 hover:text-sky-600"
              >
                {property.title}
              </Link>

              <p className="mt-1 text-sm text-slate-500">
                {property.address ||
                  "Address not provided"}

                {districtLabel
                  ? ` · ${districtLabel}`
                  : ""}
              </p>
            </div>


          </div>

          <div className="mt-5">
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(property.price, property.listing_type)}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              {property.bedrooms !== null && (
                <span>
                  {property.bedrooms} Beds
                </span>
              )}

              {property.bathrooms !== null && (
                <span>
                  {property.bathrooms} Baths
                </span>
              )}

              {property.size_sqft !== null && (
                <span>
                  {property.size_sqft.toLocaleString(
                    "en-SG"
                  )}{" "}
                  sqft
                </span>
              )}

              {psf !== null && (
                <span>
                  $
                  {psf.toLocaleString("en-SG")} psf
                </span>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {property.agent_name ? (
                  <>
                    <div className="font-semibold text-slate-800">
                      Listed by{" "}
                      {property.agent_name}
                    </div>

                    {property.agency_name && (
                      <div className="mt-1 text-xs text-slate-400">
                        {property.agency_name}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-slate-400">
                    Agent information unavailable
                  </div>
                )}
              </div>

              <Link
                href={`/property/${property.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View property
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}