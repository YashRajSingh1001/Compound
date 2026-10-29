import { createClient } from "@/lib/supabase/server";
import { VISION_BUCKET } from "@/lib/vision";

// Vision board photo upload. Runs on the server, where the login cookie is
// known; the browser has already shrunk the photo to a ~1600 px JPEG.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const itemId = form?.get("itemId");
  const photo = form?.get("photo");
  if (typeof itemId !== "string" || !(photo instanceof Blob) || photo.size === 0) {
    return Response.json({ error: "No photo received" }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) return Response.json({ error: "Photo is too large" }, { status: 413 });

  const { data: item } = await supabase.from("vision_items").select("id, image_path").eq("id", itemId).single();
  if (!item) return Response.json({ error: "Goal not found" }, { status: 404 });

  const path = `${user.id}/${itemId}-${Date.now()}.jpg`;
  const upload = await supabase.storage.from(VISION_BUCKET).upload(path, photo, { contentType: "image/jpeg" });
  if (upload.error) return Response.json({ error: upload.error.message }, { status: 500 });

  const { error } = await supabase.from("vision_items").update({ image_path: path, image_url: null }).eq("id", itemId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (item.image_path) await supabase.storage.from(VISION_BUCKET).remove([item.image_path]);
  return Response.json({ path });
}
