import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import PropertyDetail from "@/app/components/PropertyDetail";
import { loadPropertyDetail } from "@/lib/property-detail";

export const metadata = { title: "Owner preview | Project AI", robots: { index: false, follow: false } };

export default async function OwnerPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
      getAll: () => cookieStore.getAll(),
      // Server rendering cannot write cookies. The existing browser auth client
      // maintains the session; a failed verification never grants preview access.
      setAll: () => {},
    } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: property, error: propertyError } = await loadPropertyDetail(supabase, id, true);
  if (propertyError || !property) notFound();
  return <PropertyDetail ownerPreview />;
}
