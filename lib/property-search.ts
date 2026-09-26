import { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyCardData } from "@/app/components/PropertyCard";

import { RESIDENTIAL_TYPES } from "@/lib/marketplace";

export const PROPERTY_SEARCH_PAGE_SIZE = 20;

export type PropertySort =
  | "recommended"
  | "newest"
  | "price-low"
  | "price-high"
  | "size-large";

export type PropertySearchFilters = {
  listingType?: string;
  keyword?: string;
  district?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  sort?: PropertySort;
  page?: number;
};

export type PropertySearchResult = {
  properties: PropertyCardData[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PropertyRow = {
  id: string;
  title: string;
  listing_type: string | null;
  property_type: string | null;
  address: string | null;
  district: string | null;
  price: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  status: string | null;
  agent_id: string | null;
};

type PropertyImageRow = {
  property_id: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
};

type PublicAgentRow = {
  id: string;
  full_name: string | null;
  agency_name: string | null;
};

function normalizePage(page?: number) {
  if (
    page === undefined ||
    !Number.isFinite(page) ||
    page < 1
  ) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function escapeLikePattern(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function normalizeListingType(value?: string) {
  const normalized = normalizeText(value)?.toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (
    normalized === "sale" ||
    normalized === "buy" ||
    normalized === "for sale"
  ) {
    return "Sale";
  }

  if (
    normalized === "rent" ||
    normalized === "rental" ||
    normalized === "for rent"
  ) {
    return "Rent";
  }

  return undefined;
}

function normalizeSort(
  value?: PropertySort
): PropertySort {
  const allowedSorts: PropertySort[] = [
    "recommended",
    "newest",
    "price-low",
    "price-high",
    "size-large",
  ];

  if (value && allowedSorts.includes(value)) {
    return value;
  }

  return "recommended";
}

export async function searchProperties(
  supabase: SupabaseClient,
  filters: PropertySearchFilters = {},
  pageSize = PROPERTY_SEARCH_PAGE_SIZE
): Promise<PropertySearchResult> {
  const page = normalizePage(filters.page);
  pageSize = Math.min(PROPERTY_SEARCH_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const listingType = normalizeListingType(
    filters.listingType
  );

  const keyword = normalizeText(filters.keyword);
  const district = normalizeText(filters.district);
  const propertyType = normalizeText(
    filters.propertyType
  );

  const sort = normalizeSort(filters.sort);

  /*
   * Filtering, sorting and pagination happen
   * inside Supabase.
   *
   * We do NOT download every Active listing
   * and filter everything in the browser.
   */
  let query = supabase
    .from("properties")
    .select(
      `
        id,
        title,
        listing_type,
        property_type,
        address,
        district,
        price,
        bedrooms,
        bathrooms,
        size_sqft,
        status,
        agent_id
      `,
      {
        count: "exact",
      }
    )
    .eq("status", "Active")
    .in("property_type", RESIDENTIAL_TYPES);

  if (listingType) {
    query = query.ilike(
      "listing_type",
      listingType
    );
  }

  if (district) {
    /*
     * Accept either:
     *
     * 15
     * District 15
     *
     * because some existing Project AI test data
     * uses the longer format.
     */
    const districtNumber = district
      .replace(/^district\s*/i, "")
      .trim();

    const number = Number(districtNumber);
    if (Number.isInteger(number) && number >= 1 && number <= 28) {
      query = query.in("district", [String(number), String(number).padStart(2, "0"),
        `District ${number}`, `District ${String(number).padStart(2, "0")}`]);
    }

  }

  if (propertyType) {
    query = query.eq(
      "property_type",
      propertyType
    );
  }

  if (
    filters.minPrice !== undefined &&
    Number.isFinite(filters.minPrice)
  ) {
    query = query.gte(
      "price",
      filters.minPrice
    );
  }

  if (
    filters.maxPrice !== undefined &&
    Number.isFinite(filters.maxPrice)
  ) {
    query = query.lte(
      "price",
      filters.maxPrice
    );
  }

  if (
    filters.minBedrooms !== undefined &&
    Number.isFinite(filters.minBedrooms)
  ) {
    query = query.gte(
      "bedrooms",
      filters.minBedrooms
    );
  }

  if (keyword) {
    const safeKeyword = JSON.stringify(`%${escapeLikePattern(keyword)}%`);

    query = query.or(
      [
        `title.ilike.${safeKeyword}`,
        `address.ilike.${safeKeyword}`,
        `district.ilike.${safeKeyword}`,
        `property_type.ilike.${safeKeyword}`,
      ].join(",")
    );
  }

  /*
   * Stable sorting is important for pagination.
   * id is the final tie-breaker.
   */
  if (sort === "price-low") {
    query = query
      .order("price", {
        ascending: true,
        nullsFirst: false,
      })
      .order("id", {
        ascending: true,
      });
  } else if (sort === "price-high") {
    query = query
      .order("price", {
        ascending: false,
        nullsFirst: false,
      })
      .order("id", {
        ascending: true,
      });
  } else if (sort === "size-large") {
    query = query
      .order("size_sqft", {
        ascending: false,
        nullsFirst: false,
      })
      .order("id", {
        ascending: true,
      });
  } else {
    /*
     * "recommended" currently falls back to newest.
     *
     * Later Project AI ranking, featured listings
     * and recommendation signals can replace this
     * without rebuilding the Search page.
     */
    query = query
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: true,
      });
  }

  const {
    data: propertyData,
    error: propertyError,
    count,
  } = await query.range(from, to);

  if (propertyError) {
    throw propertyError;
  }

  const propertyRows =
    (propertyData as PropertyRow[] | null) ?? [];

  const totalCount = count ?? 0;

  const totalPages =
    totalCount === 0
      ? 0
      : Math.ceil(totalCount / pageSize);

  if (propertyRows.length === 0) {
    return {
      properties: [],
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  const propertyIds = propertyRows.map(
    (property) => property.id
  );

  const agentIds = Array.from(
    new Set(
      propertyRows
        .map((property) => property.agent_id)
        .filter(
          (agentId): agentId is string =>
            Boolean(agentId)
        )
    )
  );

  /*
   * Only retrieve images belonging to properties
   * on the current results page.
   */
  const {
    data: imageData,
    error: imageError,
  } = await supabase
    .from("property_images")
    .select(
      `
        property_id,
        image_url,
        is_cover,
        display_order
      `
    )
    .in("property_id", propertyIds)
    .order("display_order", {
      ascending: true,
    });

  if (imageError) {
    throw imageError;
  }

  /*
   * Only retrieve public agent profiles required
   * for properties on this results page.
   */
  let agentRows: PublicAgentRow[] = [];

  if (agentIds.length > 0) {
    const {
      data: agentData,
      error: agentError,
    } = await supabase
      .from("public_agent_profiles")
      .select(
        `
          id,
          full_name,
          agency_name
        `
      )
      .in("id", agentIds);

    if (agentError) {
      throw agentError;
    }

    agentRows =
      (agentData as PublicAgentRow[] | null) ?? [];
  }

  const images =
    (imageData as PropertyImageRow[] | null) ?? [];

  const agentMap = new Map(
    agentRows.map((agent) => [
      agent.id,
      agent,
    ])
  );

  const imagesByProperty = new Map<
    string,
    PropertyImageRow[]
  >();

  for (const image of images) {
    const existing =
      imagesByProperty.get(image.property_id) ?? [];

    existing.push(image);

    imagesByProperty.set(
      image.property_id,
      existing
    );
  }

  /*
   * Convert database records into the common
   * PropertyCard structure used by the marketplace.
   */
  const marketplaceProperties: PropertyCardData[] =
    propertyRows.map((property) => {
      const propertyImages =
        imagesByProperty.get(property.id) ?? [];

      const coverImage =
        propertyImages.find(
          (image) => image.is_cover
        ) ??
        propertyImages[0] ??
        null;

      const agent = property.agent_id
        ? agentMap.get(property.agent_id)
        : undefined;

      return {
        id: property.id,
        title: property.title,
        listing_type: property.listing_type,
        property_type: property.property_type,
        address: property.address,
        district: property.district,
        price:
          property.price === null
            ? null
            : Number(property.price),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        size_sqft: property.size_sqft,
        status: property.status,
        cover_image_url:
          coverImage?.image_url ?? null,
        agent_name:
          agent?.full_name ?? null,
        agency_name:
          agent?.agency_name ?? null,
      };
    });

  return {
    properties: marketplaceProperties,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}