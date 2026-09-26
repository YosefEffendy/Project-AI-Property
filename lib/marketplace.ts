export const RESIDENTIAL_TYPES = [
  "Condominium", "Apartment", "HDB", "Executive Condominium", "Landed",
];

export function isRental(type: string | null) {
  return ["rent", "rental", "for rent"].includes(type?.trim().toLowerCase() ?? "");
}

export function listingLabel(type: string | null) {
  if (!type) return "Property listing";
  return isRental(type) ? "For Rent" : "For Sale";
}

export function formatPrice(price: number | null, type: string | null = null) {
  if (price === null || !Number.isFinite(price)) return "Price on request";
  return `$${price.toLocaleString("en-SG", { maximumFractionDigits: 0 })}${isRental(type) ? "/mo" : ""}`;
}

export function formatDistrict(district: string | null) {
  const value = Number(district?.replace(/^district\s*/i, "").trim());
  return Number.isInteger(value) && value >= 1 && value <= 28
    ? `District ${String(value).padStart(2, "0")}` : "";
}

export function pricePerSqft(price: number | null, area: number | null, type: string | null) {
  // Monthly rent is already shown clearly; omit a potentially misleading rental PSF.
  return !isRental(type) && price !== null && area !== null && area > 0
    ? Math.round(price / area) : null;
}
