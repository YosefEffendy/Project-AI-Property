"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { createClient } from "@/lib/supabase";
import PublicNavigation from "@/app/components/PublicNavigation";
import { RESIDENTIAL_TYPES } from "@/lib/marketplace";
import PropertyCard from "@/app/components/PropertyCard";

import {
  PropertySearchResult,
  PropertySort,
  searchProperties,
} from "@/lib/property-search";

type ListingMode = "All" | "Sale" | "Rent";

type SearchFormState = {
  keyword: string;
  listingType: ListingMode;
  district: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  sort: PropertySort;
};

const EMPTY_RESULT: PropertySearchResult = {
  properties: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const PROPERTY_TYPES = RESIDENTIAL_TYPES;

const DISTRICTS = Array.from(
  { length: 28 },
  (_, index) => String(index + 1)
);

function readListingMode(
  value: string | null
): ListingMode {
  const normalized = value?.toLowerCase();

  if (
    normalized === "sale" ||
    normalized === "buy"
  ) {
    return "Sale";
  }

  if (
    normalized === "rent" ||
    normalized === "rental"
  ) {
    return "Rent";
  }

  return "All";
}

function readPositiveNumber(
  value: string | null
): number | undefined {
  if (!value) {
    return undefined;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return undefined;
  }

  return number;
}

function readPositiveInteger(
  value: string | null
): number | undefined {
  const number = readPositiveNumber(value);

  if (number === undefined) {
    return undefined;
  }

  return Math.floor(number);
}

function readPage(value: string | null) {
  const page = readPositiveInteger(value);

  if (!page || page < 1) {
    return 1;
  }

  return page;
}

function readSort(
  value: string | null
): PropertySort {
  const allowed: PropertySort[] = [
    "recommended",
    "newest",
    "price-low",
    "price-high",
    "size-large",
  ];

  if (
    value &&
    allowed.includes(value as PropertySort)
  ) {
    return value as PropertySort;
  }

  return "recommended";
}

function readDistrict(value: string | null) {
  if (!value) return "";

  const normalized = value
    .replace(/^district\s*/i, "")
    .trim();
  const number = Number(normalized);

  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 28
  ) {
    return "";
  }

  return String(number);
}

function readPropertyType(value: string | null) {
  if (!value) return "";

  return PROPERTY_TYPES.includes(value)
    ? value
    : "";
}

function readPriceInput(value: string | null) {
  const number = readPositiveNumber(value);

  return number === undefined
    ? ""
    : String(number);
}

function readBedrooms(value: string | null) {
  const number = readPositiveInteger(value);

  if (
    number === undefined ||
    number < 1 ||
    number > 5
  ) {
    return "";
  }

  return String(number);
}

function getFormState(
  searchParams: URLSearchParams
): SearchFormState {
  return {
    keyword: (searchParams.get("q") ?? "").trim(),
    listingType: readListingMode(
      searchParams.get("listing_type")
    ),
    district: readDistrict(
      searchParams.get("district")
    ),
    propertyType: readPropertyType(
      searchParams.get("property_type")
    ),
    minPrice: readPriceInput(
      searchParams.get("min_price")
    ),
    maxPrice: readPriceInput(
      searchParams.get("max_price")
    ),
    minBedrooms: readBedrooms(
      searchParams.get("bedrooms")
    ),
    sort: readSort(searchParams.get("sort")),
  };
}

function validateSearchForm(
  form: SearchFormState
): string {
  const minPrice = readPositiveNumber(
    form.minPrice || null
  );
  const maxPrice = readPositiveNumber(
    form.maxPrice || null
  );

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice > maxPrice
  ) {
    return "Minimum price cannot be higher than maximum price.";
  }

  return "";
}

export default function SearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const currentParams = useMemo(
    () =>
      new URLSearchParams(
        searchParams.toString()
      ),
    [searchParams]
  );

  const urlState = useMemo(
    () => getFormState(currentParams),
    [currentParams]
  );

  const currentPage = readPage(
    currentParams.get("page")
  );

  const [form, setForm] =
    useState<SearchFormState>(urlState);

  const [result, setResult] =
    useState<PropertySearchResult>(
      EMPTY_RESULT
    );

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [validationMessage, setValidationMessage] =
    useState("");

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  /*
   * Keep the visible controls synchronized with
   * browser Back / Forward navigation.
   */
  const [previousUrlState, setPreviousUrlState] = useState(urlState);
  if (previousUrlState !== urlState) {
    setPreviousUrlState(urlState);
    setForm(urlState);
  }

  /*
   * The URL is the source of truth for the actual
   * marketplace query.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      const urlValidationMessage =
        validateSearchForm(urlState);

      setErrorMessage("");
      setValidationMessage(urlValidationMessage);

      if (urlValidationMessage) {
        setResult(EMPTY_RESULT);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await searchProperties(
          supabase,
          {
            keyword:
              urlState.keyword || undefined,

            listingType:
              urlState.listingType === "All"
                ? undefined
                : urlState.listingType,

            district:
              urlState.district || undefined,

            propertyType:
              urlState.propertyType ||
              undefined,

            minPrice: readPositiveNumber(
              urlState.minPrice || null
            ),

            maxPrice: readPositiveNumber(
              urlState.maxPrice || null
            ),

            minBedrooms:
              readPositiveInteger(
                urlState.minBedrooms || null
              ),

            sort: urlState.sort,

            page: currentPage,
          }
        );

        if (!cancelled) {
          setResult(data);
        }
      } catch (error) {
        console.error(
          "Property search failed:",
          error
        );

        if (!cancelled) {
          setResult(EMPTY_RESULT);

          setErrorMessage(
            "We could not load the property listings. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    urlState,
    currentPage,
  ]);

  /*
   * Central URL writer.
   *
   * Every marketplace filter goes through this
   * function so Search URLs remain shareable.
   */
  const navigateWithParams = useCallback(
    (
      updates: Record<
        string,
        string | null | undefined
      >,
      options?: {
        preservePage?: boolean;
      }
    ) => {
      const params = new URLSearchParams(
        searchParams.toString()
      );

      for (const [key, value] of Object.entries(
        updates
      )) {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      if (!options?.preservePage) {
        params.delete("page");
      }

      const query = params.toString();

      router.push(
        query
          ? `${pathname}?${query}`
          : pathname
      );
    },
    [
      pathname,
      router,
      searchParams,
    ]
  );

  function updateForm<
    Key extends keyof SearchFormState
  >(
    key: Key,
    value: SearchFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const message = validateSearchForm(form);
    setValidationMessage(message);

    if (message) {
      return;
    }

    navigateWithParams({
      q: form.keyword.trim() || null,

      listing_type:
        form.listingType === "All"
          ? null
          : form.listingType.toLowerCase(),

      district:
        form.district || null,

      property_type:
        form.propertyType || null,

      min_price:
        form.minPrice || null,

      max_price:
        form.maxPrice || null,

      bedrooms:
        form.minBedrooms || null,

      sort:
        form.sort === "recommended"
          ? null
          : form.sort,
    });

    setMobileFiltersOpen(false);
  }

  function changeListingType(
    mode: ListingMode
  ) {
    updateForm("listingType", mode);

    navigateWithParams({
      listing_type:
        mode === "All"
          ? null
          : mode.toLowerCase(),
    });
  }

  function changeSort(
    sort: PropertySort
  ) {
    updateForm("sort", sort);

    navigateWithParams({
      sort:
        sort === "recommended"
          ? null
          : sort,
    });
  }

  function resetFilters() {
    setValidationMessage("");
    setErrorMessage("");

    setForm({
      keyword: "",
      listingType: "All",
      district: "",
      propertyType: "",
      minPrice: "",
      maxPrice: "",
      minBedrooms: "",
      sort: "recommended",
    });

    router.push(pathname);

    setMobileFiltersOpen(false);
  }

  function goToPage(page: number) {
    if (
      page < 1 ||
      (
        result.totalPages > 0 &&
        page > result.totalPages
      )
    ) {
      return;
    }

    navigateWithParams(
      {
        page:
          page === 1
            ? null
            : String(page),
      },
      {
        preservePage: true,
      }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const showingFrom =
    result.totalCount === 0
      ? 0
      : (result.page - 1) *
          result.pageSize +
        1;

  const showingTo =
    result.totalCount === 0
      ? 0
      : Math.min(
          result.page * result.pageSize,
          result.totalCount
        );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVIGATION */}
      <PublicNavigation />

      {/* SEARCH HEADER */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
                Property Search
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Find your next property
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Browse active Singapore property
                listings from Project AI agents.
              </p>
            </div>

            <form
              onSubmit={applyFilters}
              className="w-full lg:max-w-2xl"
            >
              <label
                htmlFor="property-search"
                className="sr-only"
              >
                Search properties
              </label>

              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:flex-row">
                <input
                  id="property-search"
                  type="search"
                  value={form.keyword}
                  onChange={(event) =>
                    updateForm(
                      "keyword",
                      event.target.value
                    )
                  }
                  placeholder="Search project, address, district or property type"
                  className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-sky-500 px-6 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  Search
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Search by location or property name.
                AI search is coming soon.
              </p>
            </form>
          </div>

          {/* MOBILE QUICK CONTROLS */}
          <div className="mt-6 flex flex-wrap gap-2 lg:hidden">
            {(
              [
                "All",
                "Sale",
                "Rent",
              ] as ListingMode[]
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  changeListingType(mode)
                }
                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${
                  urlState.listingType === mode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {mode === "Sale"
                  ? "Buy"
                  : mode}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setMobileFiltersOpen(true)
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
            >
              Filters
            </button>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* DESKTOP FILTERS */}
          <aside className="hidden lg:block">
            <form
              onSubmit={applyFilters}
              className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold">
                  Filters
                </h2>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  Reset
                </button>
              </div>

              <div className="mt-7 space-y-7">
                <div>
                  <label className="text-sm font-semibold">
                    Listing type
                  </label>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        "All",
                        "Sale",
                        "Rent",
                      ] as ListingMode[]
                    ).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          changeListingType(mode)
                        }
                        className={`rounded-lg border px-2 py-2.5 text-sm ${
                          urlState.listingType ===
                          mode
                            ? "border-slate-900 bg-slate-900 font-semibold text-white"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {mode === "Sale"
                          ? "Buy"
                          : mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="district-filter"
                    className="text-sm font-semibold"
                  >
                    District
                  </label>

                  <select
                    id="district-filter"
                    value={form.district}
                    onChange={(event) =>
                      updateForm(
                        "district",
                        event.target.value
                      )
                    }
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
                  >
                    <option value="">
                      All districts
                    </option>

                    {DISTRICTS.map(
                      (district) => (
                        <option
                          key={district}
                          value={district}
                        >
                          District {district.padStart(2, "0")}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="property-type-filter"
                    className="text-sm font-semibold"
                  >
                    Property type
                  </label>

                  <select
                    id="property-type-filter"
                    value={form.propertyType}
                    onChange={(event) =>
                      updateForm(
                        "propertyType",
                        event.target.value
                      )
                    }
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
                  >
                    <option value="">
                      All property types
                    </option>

                    {PROPERTY_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Price range
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={form.minPrice}
                      onChange={(event) =>
                        updateForm(
                          "minPrice",
                          event.target.value
                        )
                      }
                      placeholder="Min"
                      aria-label="Minimum price"
                      className="min-w-0 rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-sky-400"
                    />

                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={form.maxPrice}
                      onChange={(event) =>
                        updateForm(
                          "maxPrice",
                          event.target.value
                        )
                      }
                      placeholder="Max"
                      aria-label="Maximum price"
                      className="min-w-0 rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-sky-400"
                    />
                  </div>

                  {validationMessage && (
                    <p
                      role="alert"
                      className="mt-2 text-xs font-medium text-red-600"
                    >
                      {validationMessage}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="bedroom-filter"
                    className="text-sm font-semibold"
                  >
                    Minimum bedrooms
                  </label>

                  <select
                    id="bedroom-filter"
                    value={form.minBedrooms}
                    onChange={(event) =>
                      updateForm(
                        "minBedrooms",
                        event.target.value
                      )
                    }
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
                  >
                    <option value="">
                      Any
                    </option>
                    <option value="1">
                      1+
                    </option>
                    <option value="2">
                      2+
                    </option>
                    <option value="3">
                      3+
                    </option>
                    <option value="4">
                      4+
                    </option>
                    <option value="5">
                      5+
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Apply filters
                </button>
              </div>
            </form>
          </aside>

          {/* PROPERTY RESULTS */}
          <div className="min-w-0">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {loading ? (
                  <span className="font-bold">
                    Loading properties...
                  </span>
                ) : (
                  <>
                    <span className="font-bold">
                      {result.totalCount}{" "}
                      {result.totalCount === 1
                        ? "property"
                        : "properties"}
                    </span>

                    {result.totalCount > 0 && (
                      <span className="ml-2 text-sm text-slate-500">
                        showing {showingFrom}–
                        {showingTo}
                      </span>
                    )}
                  </>
                )}
              </div>

              <select
                value={form.sort}
                onChange={(event) =>
                  changeSort(
                    event.target
                      .value as PropertySort
                  )
                }
                aria-label="Sort properties"
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-600"
              >
                <option value="recommended">
                  Sort: Latest listings
                </option>

                <option value="newest">
                  Newest
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>

                <option value="size-large">
                  Size: Largest First
                </option>
              </select>
            </div>

            {!loading && validationMessage && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="font-bold text-amber-900">
                  Check your filters
                </h2>

                <p className="mt-2 text-sm text-amber-800">
                  {validationMessage}
                </p>
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <div className="text-lg font-semibold">
                  Loading Project AI listings...
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Retrieving matching properties,
                  photos and agent information.
                </p>
              </div>
            )}

            {!loading && errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-white p-8">
                <h2 className="font-bold text-red-700">
                  Could not load listings
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {errorMessage}
                </p>
              </div>
            )}

            {!loading &&
              !errorMessage &&
              !validationMessage &&
              result.properties.length ===
                0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <h2 className="text-xl font-bold">
                    No properties found
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try changing your search
                    criteria or resetting the
                    filters.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Reset filters
                  </button>
                </div>
              )}

            {!loading &&
              !errorMessage &&
              !validationMessage &&
              result.properties.length >
                0 && (
                <>
                  <div className="space-y-5">
                    {result.properties.map(
                      (property) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                        />
                      )
                    )}
                  </div>

                  {/* PAGINATION */}
                  {result.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <button
                        type="button"
                        disabled={
                          result.page <= 1
                        }
                        onClick={() =>
                          goToPage(
                            result.page - 1
                          )
                        }
                        className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Previous
                      </button>

                      <div className="text-center text-sm text-slate-500">
                        Page{" "}
                        <span className="font-semibold text-slate-900">
                          {result.page}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-slate-900">
                          {result.totalPages}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={
                          result.page >=
                          result.totalPages
                        }
                        onClick={() =>
                          goToPage(
                            result.page + 1
                          )
                        }
                        className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      </section>

      {/* MOBILE FILTER DRAWER */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() =>
              setMobileFiltersOpen(false)
            }
            className="absolute inset-0 bg-slate-950/40"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Filters
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen(false)
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={applyFilters}
              className="mt-6 space-y-6"
            >
              <div>
                <label
                  htmlFor="mobile-district"
                  className="text-sm font-semibold"
                >
                  District
                </label>

                <select
                  id="mobile-district"
                  value={form.district}
                  onChange={(event) =>
                    updateForm(
                      "district",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">
                    All districts
                  </option>

                  {DISTRICTS.map(
                    (district) => (
                      <option
                        key={district}
                        value={district}
                      >
                        District {district.padStart(2, "0")}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="mobile-property-type"
                  className="text-sm font-semibold"
                >
                  Property type
                </label>

                <select
                  id="mobile-property-type"
                  value={form.propertyType}
                  onChange={(event) =>
                    updateForm(
                      "propertyType",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">
                    All property types
                  </option>

                  {PROPERTY_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Price range
                </label>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.minPrice}
                    onChange={(event) =>
                      updateForm(
                        "minPrice",
                        event.target.value
                      )
                    }
                    placeholder="Minimum"
                    aria-label="Minimum price"
                    className="min-h-12 min-w-0 rounded-xl border border-slate-200 px-3 text-sm"
                  />

                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.maxPrice}
                    onChange={(event) =>
                      updateForm(
                        "maxPrice",
                        event.target.value
                      )
                    }
                    placeholder="Maximum"
                    aria-label="Maximum price"
                    className="min-h-12 min-w-0 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>

                {validationMessage && (
                  <p
                    role="alert"
                    className="mt-2 text-xs font-medium text-red-600"
                  >
                    {validationMessage}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="mobile-bedrooms"
                  className="text-sm font-semibold"
                >
                  Minimum bedrooms
                </label>

                <select
                  id="mobile-bedrooms"
                  value={form.minBedrooms}
                  onChange={(event) =>
                    updateForm(
                      "minBedrooms",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">
                    Any
                  </option>
                  <option value="1">
                    1+
                  </option>
                  <option value="2">
                    2+
                  </option>
                  <option value="3">
                    3+
                  </option>
                  <option value="4">
                    4+
                  </option>
                  <option value="5">
                    5+
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-12 rounded-xl border border-slate-200 font-semibold text-slate-700"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-slate-900 font-semibold text-white"
                >
                  Show properties
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}