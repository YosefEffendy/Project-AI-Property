"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type PropertyImage = {
  id: string;
  property_id: string;
  storage_path: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
  created_at: string;
};

type SortablePhotoProps = {
  image: PropertyImage;
  deletingImageId: string | null;
  onSetCover: (imageId: string) => void;
  onDelete: (image: PropertyImage) => void;
};

function SortablePhoto({
  image,
  deletingImageId,
  onSetCover,
  onDelete,
}: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 20 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-xl border bg-white ${
        isDragging
          ? "border-sky-400 shadow-xl"
          : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <img
          src={image.image_url}
          alt="Property"
          draggable={false}
          className="h-full w-full object-cover"
        />

        {image.is_cover && (
          <div className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            Cover Photo
          </div>
        )}

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute right-3 top-3 flex h-10 w-10 cursor-grab items-center justify-center rounded-full bg-white/95 text-lg font-bold text-slate-700 shadow-md hover:bg-white active:cursor-grabbing"
          title="Drag to reorder photo"
          aria-label="Drag to reorder photo"
        >
          ⠿
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        {!image.is_cover ? (
          <button
            type="button"
            onClick={() => onSetCover(image.id)}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Make Cover
          </button>
        ) : (
          <span className="text-sm font-semibold text-slate-500">
            Main image
          </span>
        )}

        <button
          type="button"
          onClick={() => onDelete(image)}
          disabled={deletingImageId === image.id}
          className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          {deletingImageId === image.id
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function ManageListing() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const supabase = createClient();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [listing, setListing] =
    useState<any>(null);

  const [images, setImages] =
    useState<PropertyImage[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [reordering, setReordering] =
    useState(false);

  const [
    deletingImageId,
    setDeletingImageId,
  ] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const {
        data: property,
        error: propertyError,
      } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", user.id)
        .single();

      if (propertyError) {
        console.error(
          "Error loading listing:",
          propertyError
        );

        setLoading(false);
        return;
      }

      const {
        data: propertyImages,
        error: imageError,
      } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", id)
        .order("display_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

      if (imageError) {
        console.error(
          "Error loading property images:",
          imageError
        );
      }

      setListing(property);
      setImages(propertyImages || []);
      setLoading(false);
    }

    loadPage();
  }, [id]);

  async function saveChanges() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(
        "You must be logged in to update this listing."
      );

      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("properties")
      .update({
        title: listing.title,
        address: listing.address,
        district: listing.district,

        price: listing.price
          ? Number(listing.price)
          : null,

        property_type:
          listing.property_type,

        bedrooms:
          listing.bedrooms !== ""
            ? Number(listing.bedrooms)
            : null,

        bathrooms:
          listing.bathrooms !== ""
            ? Number(listing.bathrooms)
            : null,

        size_sqft:
          listing.size_sqft !== ""
            ? Number(listing.size_sqft)
            : null,

        description:
          listing.description,

        status:
          listing.status,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) {
      console.error(
        "Error updating listing:",
        error
      );

      alert(
        "Could not save changes: " +
          error.message
      );

      setSaving(false);
      return;
    }

    alert(
      "Listing updated successfully!"
    );

    setSaving(false);

    router.push(
      "/agent/listings"
    );
  }

  async function convertHeicToJpeg(
    file: File
  ): Promise<File> {
    const lowerName =
      file.name.toLowerCase();

    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      lowerName.endsWith(".heic") ||
      lowerName.endsWith(".heif");

    if (!isHeic) {
      return file;
    }

    const heic2anyModule =
      await import("heic2any");

    const heic2any =
      heic2anyModule.default;

    const convertedResult =
      await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });

    const convertedBlob =
      Array.isArray(convertedResult)
        ? convertedResult[0]
        : convertedResult;

    const newFileName =
      file.name.replace(
        /\.(heic|heif)$/i,
        ".jpg"
      );

    return new File(
      [convertedBlob],
      newFileName,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );
  }

  async function uploadPhotos(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    if (selectedFiles.length === 0) {
      return;
    }

    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size >
          10 * 1024 * 1024
      );

    if (oversizedFile) {
      alert(
        `${oversizedFile.name} is larger than 10 MB. Please choose a smaller image.`
      );

      event.target.value = "";
      return;
    }

    const supportedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".heic",
      ".heif",
    ];

    const unsupportedFile =
      selectedFiles.find(
        (file) => {
          const lowerName =
            file.name.toLowerCase();

          return !supportedExtensions.some(
            (extension) =>
              lowerName.endsWith(
                extension
              )
          );
        }
      );

    if (unsupportedFile) {
      alert(
        `${unsupportedFile.name} is not supported. Please upload JPG, PNG, WebP, HEIC or HEIF images.`
      );

      event.target.value = "";
      return;
    }

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(
        "You must be logged in to upload photos."
      );

      setUploading(false);
      event.target.value = "";
      return;
    }

    const newImages:
      PropertyImage[] = [];

    try {
      for (
        let index = 0;
        index < selectedFiles.length;
        index++
      ) {
        const originalFile =
          selectedFiles[index];

        let fileToUpload: File;

        try {
          fileToUpload =
            await convertHeicToJpeg(
              originalFile
            );
        } catch (
          conversionError
        ) {
          console.error(
            "HEIC conversion error:",
            conversionError
          );

          alert(
            `Could not convert ${originalFile.name}. Please try another image.`
          );

          continue;
        }

        if (
          fileToUpload.size >
          10 * 1024 * 1024
        ) {
          alert(
            `${originalFile.name} is larger than 10 MB after conversion. Please choose a smaller image.`
          );

          continue;
        }

        const extension =
          fileToUpload.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const uniqueName =
          `${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const storagePath =
          `${user.id}/${id}/${uniqueName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("property-images")
          .upload(
            storagePath,
            fileToUpload,
            {
              cacheControl:
                "3600",

              upsert: false,

              contentType:
                fileToUpload.type,
            }
          );

        if (uploadError) {
          console.error(
            "Image upload error:",
            uploadError
          );

          alert(
            `Could not upload ${originalFile.name}: ${uploadError.message}`
          );

          continue;
        }

        const {
          data: {
            publicUrl,
          },
        } = supabase.storage
          .from("property-images")
          .getPublicUrl(
            storagePath
          );

        const shouldBeCover =
          images.length === 0 &&
          newImages.length === 0;

        const {
          data: savedImage,
          error: databaseError,
        } = await supabase
          .from("property_images")
          .insert({
            property_id: id,

            storage_path:
              storagePath,

            image_url:
              publicUrl,

            is_cover:
              shouldBeCover,

            display_order:
              images.length +
              newImages.length,
          })
          .select()
          .single();

        if (databaseError) {
          console.error(
            "Error saving image record:",
            databaseError
          );

          await supabase.storage
            .from(
              "property-images"
            )
            .remove([
              storagePath,
            ]);

          alert(
            `The photo uploaded but could not be attached to the listing: ${databaseError.message}`
          );

          continue;
        }

        newImages.push(
          savedImage
        );
      }

      if (
        newImages.length > 0
      ) {
        setImages(
          (
            currentImages
          ) => [
            ...currentImages,
            ...newImages,
          ]
        );
      }
    } finally {
      setUploading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  async function handleDragEnd(
    event: DragEndEvent
  ) {
    const {
      active,
      over,
    } = event;

    if (
      !over ||
      active.id === over.id
    ) {
      return;
    }

    const oldIndex =
      images.findIndex(
        (image) =>
          image.id ===
          active.id
      );

    const newIndex =
      images.findIndex(
        (image) =>
          image.id ===
          over.id
      );

    if (
      oldIndex === -1 ||
      newIndex === -1
    ) {
      return;
    }

    const previousImages =
      [...images];

    const reorderedImages =
      arrayMove(
        images,
        oldIndex,
        newIndex
      ).map(
        (
          image,
          index
        ) => ({
          ...image,
          display_order:
            index,
        })
      );

    setImages(
      reorderedImages
    );

    setReordering(true);

    try {
      for (
        const image of
        reorderedImages
      ) {
        const {
          error,
        } = await supabase
          .from(
            "property_images"
          )
          .update({
            display_order:
              image.display_order,
          })
          .eq(
            "id",
            image.id
          )
          .eq(
            "property_id",
            id
          );

        if (error) {
          throw error;
        }
      }
    } catch (error: any) {
      console.error(
        "Error saving photo order:",
        error
      );

      setImages(
        previousImages
      );

      alert(
        "Could not save the new photo order. The previous order has been restored."
      );
    } finally {
      setReordering(false);
    }
  }

  async function setCoverPhoto(
    imageId: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(
        "You must be logged in."
      );

      return;
    }

    const {
      error: clearError,
    } = await supabase
      .from("property_images")
      .update({
        is_cover: false,
      })
      .eq(
        "property_id",
        id
      );

    if (clearError) {
      console.error(
        "Error clearing cover photo:",
        clearError
      );

      alert(
        "Could not change cover photo: " +
          clearError.message
      );

      return;
    }

    const {
      error: coverError,
    } = await supabase
      .from("property_images")
      .update({
        is_cover: true,
      })
      .eq(
        "id",
        imageId
      )
      .eq(
        "property_id",
        id
      );

    if (coverError) {
      console.error(
        "Error setting cover photo:",
        coverError
      );

      alert(
        "Could not change cover photo: " +
          coverError.message
      );

      return;
    }

    setImages(
      (
        currentImages
      ) =>
        currentImages.map(
          (image) => ({
            ...image,

            is_cover:
              image.id ===
              imageId,
          })
        )
    );
  }

  async function deletePhoto(
    image: PropertyImage
  ) {
    const confirmed =
      window.confirm(
        "Delete this photo from the listing?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingImageId(
      image.id
    );

    const wasCover =
      image.is_cover;

    const {
      error: storageError,
    } =
      await supabase.storage
        .from(
          "property-images"
        )
        .remove([
          image.storage_path,
        ]);

    if (storageError) {
      console.error(
        "Error deleting photo from storage:",
        storageError
      );

      alert(
        "Could not delete photo: " +
          storageError.message
      );

      setDeletingImageId(
        null
      );

      return;
    }

    const {
      error: databaseError,
    } = await supabase
      .from(
        "property_images"
      )
      .delete()
      .eq(
        "id",
        image.id
      )
      .eq(
        "property_id",
        id
      );

    if (databaseError) {
      console.error(
        "Error deleting image record:",
        databaseError
      );

      alert(
        "The image file was deleted, but the database record could not be removed: " +
          databaseError.message
      );

      setDeletingImageId(
        null
      );

      return;
    }

    const remainingImages =
      images
        .filter(
          (
            currentImage
          ) =>
            currentImage.id !==
            image.id
        )
        .map(
          (
            currentImage,
            index
          ) => ({
            ...currentImage,

            display_order:
              index,
          })
        );

    if (
      wasCover &&
      remainingImages.length >
        0
    ) {
      const newCover =
        remainingImages[0];

      const {
        error:
          newCoverError,
      } = await supabase
        .from(
          "property_images"
        )
        .update({
          is_cover: true,
        })
        .eq(
          "id",
          newCover.id
        )
        .eq(
          "property_id",
          id
        );

      if (
        !newCoverError
      ) {
        newCover.is_cover =
          true;
      }
    }

    setImages(
      remainingImages
    );

    setDeletingImageId(
      null
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">
          Loading listing...
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">
          Listing not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/agent/dashboard"
            className="flex items-center gap-3"
          >
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
          </a>

          <div className="flex items-center gap-3">
  <a
    href={`/agent/listings/${id}/preview`}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
  >
    Preview Listing ↗
  </a>

  <a
    href="/agent/listings"
    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
  >
    ← Back to My Listings
  </a>
</div>
        </div>
      </nav>

      {/* PAGE */}

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="text-sm font-semibold text-sky-600">
            PROPERTY MANAGEMENT
          </div>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Manage Listing
          </h1>

          <p className="mt-2 text-slate-500">
            Edit your property information, photos and listing status.
          </p>
        </div>

        {/* PROPERTY DETAILS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div>
            <label className="text-sm font-medium text-slate-600">
              Property Name
            </label>

            <input
              type="text"
              value={
                listing.title ||
                ""
              }
              onChange={(e) =>
                setListing({
                  ...listing,

                  title:
                    e.target
                      .value,
                })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-lg font-semibold outline-none focus:border-sky-400"
            />
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-600">
              Address
            </label>

            <input
              type="text"
              value={
                listing.address ||
                ""
              }
              onChange={(e) =>
                setListing({
                  ...listing,

                  address:
                    e.target
                      .value,
                })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
            />
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-600">
              District
            </label>

            <input
              type="text"
              value={
                listing.district ||
                ""
              }
              onChange={(e) =>
                setListing({
                  ...listing,

                  district:
                    e.target
                      .value,
                })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
            />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">
                Asking Price (S$)
              </label>

              <input
                type="number"
                value={
                  listing.price ||
                  ""
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    price:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-lg font-semibold outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Property Type
              </label>

              <select
                value={
                  listing.property_type ||
                  ""
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    property_type:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400"
              >
                <option value="Condominium">
                  Condominium
                </option>

                <option value="HDB">
                  HDB
                </option>

                <option value="Landed">
                  Landed
                </option>

                <option value="Executive Condominium">
                  Executive Condominium
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Bedrooms
              </label>

              <input
                type="number"
                min="0"
                value={
                  listing.bedrooms ??
                  ""
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    bedrooms:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Bathrooms
              </label>

              <input
                type="number"
                min="0"
                value={
                  listing.bathrooms ??
                  ""
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    bathrooms:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Floor Area (sqft)
              </label>

              <input
                type="number"
                min="0"
                value={
                  listing.size_sqft ??
                  ""
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    size_sqft:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Status
              </label>

              <select
                value={
                  listing.status ||
                  "Draft"
                }
                onChange={(e) =>
                  setListing({
                    ...listing,

                    status:
                      e.target
                        .value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-400"
              >
                <option value="Active">
                  Active
                </option>

                <option value="Draft">
                  Draft
                </option>
              </select>
            </div>
          </div>

          <div className="mt-8">
            <label className="text-sm font-medium text-slate-600">
              Description
            </label>

            <textarea
              rows={7}
              value={
                listing.description ||
                ""
              }
              onChange={(e) =>
                setListing({
                  ...listing,

                  description:
                    e.target
                      .value,
                })
              }
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
            />
          </div>
        </section>

        {/* PROPERTY PHOTOS */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">
                Property Photos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload property photos, drag them into the order buyers should see them, and choose the main cover image.
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">
                {images.length}{" "}
                {images.length ===
                1
                  ? "photo"
                  : "photos"}
              </div>

              {reordering && (
                <div className="mt-1 text-xs font-medium text-sky-600">
                  Saving photo order...
                </div>
              )}
            </div>
          </div>

          {images.length >
            0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={
                closestCenter
              }
              onDragEnd={
                handleDragEnd
              }
            >
              <SortableContext
                items={images.map(
                  (image) =>
                    image.id
                )}
                strategy={
                  horizontalListSortingStrategy
                }
              >
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map(
                    (image) => (
                      <SortablePhoto
                        key={
                          image.id
                        }
                        image={
                          image
                        }
                        deletingImageId={
                          deletingImageId
                        }
                        onSetCover={
                          setCoverPhoto
                        }
                        onDelete={
                          deletePhoto
                        }
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {images.length >
            1 && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                Photo order:
              </span>{" "}
              Hold the ⠿ handle
              and drag a photo
              to a new position.
              The new order is
              saved automatically.
            </div>
          )}

          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              multiple
              onChange={
                uploadPhotos
              }
              className="hidden"
            />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              ↑
            </div>

            <h3 className="mt-4 font-semibold">
              Upload property photos
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              JPG, PNG, WebP,
              HEIC and HEIF up
              to 10 MB each.
              HEIC/HEIF files
              are converted
              automatically.
            </p>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading ||
                reordering
              }
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "+ Choose Photos"}
            </button>
          </div>
        </section>

        {/* SAVE */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-end gap-4">
            <a
              href="/agent/listings"
              className="rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </a>

            <button
              type="button"
              onClick={
                saveChanges
              }
              disabled={
                saving ||
                uploading ||
                reordering
              }
              className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}