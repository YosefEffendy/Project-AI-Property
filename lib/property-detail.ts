import type { SupabaseClient } from "@supabase/supabase-js";
import { RESIDENTIAL_TYPES } from "@/lib/marketplace";

export const PUBLIC_PROPERTY_FIELDS = "id,title,listing_type,property_type,address,district,price,bedrooms,bathrooms,size_sqft,description,status,agent_id";

export async function loadPropertyDetail(supabase: SupabaseClient, id: string, ownerPreview = false) {
  let ownerId: string | undefined;
  if (ownerPreview) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { data: null, error: null };
    ownerId = user.id;
  }
  let query = supabase.from("properties").select(PUBLIC_PROPERTY_FIELDS).eq("id", id);
  if (ownerId) {
    query = query.eq("agent_id", ownerId);
  } else {
    query = query.eq("status", "Active").in("property_type", RESIDENTIAL_TYPES);
  }
  return query.maybeSingle();
}
