"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AddListing() {
  const router = useRouter();
  const supabase = createClient();

  const [listingType, setListingType] = useState("Sale");
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState("Condominium");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("15");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [floorArea, setFloorArea] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveListing(status: "Draft" | "Active") {
    if (isSaving) return;

    const trimmedPropertyName = propertyName.trim();
    const trimmedAddress = address.trim();

    if (!trimmedPropertyName) {
      alert("Please enter the property or development name.");
      return;
    }

    if (!trimmedAddress) {
      alert("Please enter the property address.");
      return;
    }

    if (!district) {
      alert("Please select a district.");
      return;
    }

    if (!price || Number(price) <= 0) {
      alert(
        listingType === "Sale"
          ? "Please enter a valid asking price."
          : "Please enter a valid monthly rent."
      );
      return;
    }

    if (!floorArea || Number(floorArea) <= 0) {
      alert("Please enter a valid floor area.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
        alert("Could not verify your login. Please try again.");
        return;
      }

      if (!user) {
        alert("You must be logged in to save a listing.");
        return;
      }

      const { error } = await supabase.from("properties").insert({
        agent_id: user.id,
        title: trimmedPropertyName,
        listing_type: listingType,
        property_type: propertyType,
        address: trimmedAddress,
        district,
        price: Number(price),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        size_sqft: Number(floorArea),
        description: description.trim(),
        status,
      });

      if (error) {
        console.error(error);
        alert("Could not save listing: " + error.message);
        return;
      }

      alert("Listing saved successfully!");
      router.push("/agent/listings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/agent/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
              P
            </div>

            <div>
              <div className="text-xl font-bold">Project AI</div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Agent Portal
              </div>
            </div>
          </a>

          <div className="flex items-center gap-4">
            <a
              href="/agent/listings"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              My Listings
            </a>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
              SL
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* TITLE */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-sky-600">
            PROPERTY MANAGEMENT
          </div>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Add New Listing
          </h1>

          <p className="mt-2 text-slate-500">
            Add your property details and prepare your listing for publication.
          </p>
        </div>

        {/* BASIC INFORMATION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-xl font-bold">Basic Information</h2>

          <p className="mt-1 text-sm text-slate-500">
            Start with the essential property information.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* PROPERTY NAME */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">
                Property / Development Name
              </label>

              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. The Continuum"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>

            {/* LISTING TYPE */}
            <div>
              <label className="text-sm font-semibold">Listing Type</label>

              <div className="mt-2 flex rounded-xl border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setListingType("Sale")}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold ${
                    listingType === "Sale"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500"
                  }`}
                >
                  For Sale
                </button>

                <button
                  type="button"
                  onClick={() => setListingType("Rent")}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold ${
                    listingType === "Rent"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500"
                  }`}
                >
                  For Rent
                </button>
              </div>
            </div>

            {/* PROPERTY TYPE */}
            <div>
              <label className="text-sm font-semibold">Property Type</label>

              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400"
              >
                <option value="Condominium">Condominium</option>
                <option value="HDB">HDB</option>
                <option value="Landed">Landed</option>
                <option value="Apartment">Apartment</option>
                <option value="Executive Condominium">
                  Executive Condominium
                </option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            {/* ADDRESS */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Address</label>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 9 Thiam Siew Avenue"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>

            {/* DISTRICT */}
            <div>
              <label className="text-sm font-semibold">District</label>

              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400"
              >
                <option value="1">District 01</option>
                <option value="2">District 02</option>
                <option value="3">District 03</option>
                <option value="4">District 04</option>
                <option value="5">District 05</option>
                <option value="6">District 06</option>
                <option value="7">District 07</option>
                <option value="8">District 08</option>
                <option value="9">District 09</option>
                <option value="10">District 10</option>
                <option value="11">District 11</option>
                <option value="12">District 12</option>
                <option value="13">District 13</option>
                <option value="14">District 14</option>
                <option value="15">District 15</option>
                <option value="16">District 16</option>
                <option value="17">District 17</option>
                <option value="18">District 18</option>
                <option value="19">District 19</option>
                <option value="20">District 20</option>
                <option value="21">District 21</option>
                <option value="22">District 22</option>
                <option value="23">District 23</option>
                <option value="24">District 24</option>
                <option value="25">District 25</option>
                <option value="26">District 26</option>
                <option value="27">District 27</option>
                <option value="28">District 28</option>
              </select>
            </div>

            {/* PRICE */}
            <div>
              <label className="text-sm font-semibold">
                {listingType === "Sale" ? "Asking Price" : "Monthly Rent"}
              </label>

              <div className="mt-2 flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-4 text-slate-500">
                  $
                </span>

                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={listingType === "Sale" ? "2480000" : "6500"}
                  className="w-full rounded-r-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PROPERTY DETAILS */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-xl font-bold">Property Details</h2>

          <p className="mt-1 text-sm text-slate-500">
            Tell buyers more about the property.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* BEDROOMS */}
            <div>
              <label className="text-sm font-semibold">Bedrooms</label>

              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="0">Studio</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6+</option>
              </select>
            </div>

            {/* BATHROOMS */}
            <div>
              <label className="text-sm font-semibold">Bathrooms</label>

              <select
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5+</option>
              </select>
            </div>

            {/* FLOOR AREA */}
            <div>
              <label className="text-sm font-semibold">
                Floor Area (sqft)
              </label>

              <input
                type="number"
                min="1"
                value={floorArea}
                onChange={(e) => setFloorArea(e.target.value)}
                placeholder="1044"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">
                Property Description
              </label>

              <button
                type="button"
                className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-600"
              >
                ✦ Generate with AI
              </button>
            </div>

            <textarea
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the property, renovation, facing, facilities, location advantages and other selling points..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
            />
          </div>
        </section>

        {/* PHOTOS */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-xl font-bold">Property Photos</h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload photos of the property. You can enhance them with AI later.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              ↑
            </div>

            <h3 className="mt-4 font-semibold">Upload property photos</h3>

            <p className="mt-2 text-sm text-slate-400">
              Drag and drop your images here or browse your computer.
            </p>

            <button
              type="button"
              className="mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Choose Photos
            </button>
          </div>
        </section>

        {/* AI TOOLS */}
        <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-white md:p-8">
          <div className="text-sm font-semibold uppercase tracking-wider text-sky-400">
            ✦ Project AI
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Make your listing stand out
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Once your listing is created, Project AI can help you write better
            descriptions, virtually stage rooms, improve photos and create
            marketing content.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <div className="font-semibold">AI Listing Writer</div>
              <div className="mt-1 text-xs text-slate-300">
                Create professional property descriptions.
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-4">
              <div className="font-semibold">AI Virtual Staging</div>
              <div className="mt-1 text-xs text-slate-300">
                Furnish empty rooms digitally.
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-4">
              <div className="font-semibold">AI Marketing</div>
              <div className="mt-1 text-xs text-slate-300">
                Create social media and WhatsApp content.
              </div>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-col justify-end gap-3 sm:flex-row">
          <a
            href="/agent/listings"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center font-semibold text-slate-600"
          >
            Cancel
          </a>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => saveListing("Draft")}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => saveListing("Active")}
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}