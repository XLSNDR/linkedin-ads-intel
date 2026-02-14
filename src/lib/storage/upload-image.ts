import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const BUCKET = "ad-creatives";

/**
 * Download image from URL and upload to Supabase Storage.
 * Path: ads/{adId}/creative.{ext}
 * Returns public URL or null on failure.
 */
export async function uploadAdImage(
  imageUrl: string,
  adId: string
): Promise<string | null> {
  if (!imageUrl?.startsWith("http")) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "LinkedIn-Ads-Intel-Scraper/1.0" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext =
      imageUrl.split(".").pop()?.replace(/\?.*$/, "").slice(0, 4) || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : "jpg";
    const path = `ads/${adId}/creative.${safeExt}`;
    const supabase = getClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: res.headers.get("content-type") || `image/${safeExt}`,
      upsert: true,
    });
    if (error) {
      console.warn("Supabase upload error:", error.message);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.warn("uploadAdImage error:", e);
    return null;
  }
}
