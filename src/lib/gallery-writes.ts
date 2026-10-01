import { supabase } from "@/integrations/supabase/client";
import { BUCKET, getDataClient, isExternalActive } from "./gallery";

/** Writes go to whichever database is live, as the signed-in studio admin. */
async function writeClient() {
  return (await isExternalActive())
    ? await getDataClient()
    : (supabase as unknown as Awaited<ReturnType<typeof getDataClient>>);
}

/** Uploads gallery media to whichever database is live, returning its stored path. */
export async function uploadMedia(file: File, path: string): Promise<string> {
  const client = await writeClient();
  const put = () =>
    client.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message) && (await isExternalActive())) {
    // Photo folder missing in the artist's database — create it, then retry.
    const { provisionExternalDb } = await import("./external-db.functions");
    await provisionExternalDb().catch(() => undefined);
    ({ error } = await put());
  }
  if (error) throw error;
  return path;
}

export const uploadImage = uploadMedia;

export async function saveArtwork(
  payload: Record<string, unknown>,
  id?: string,
) {
  const client = await writeClient();
  const row = payload as never;
  const { error } = id
    ? await client.from("artworks").update(row).eq("id", id)
    : await client.from("artworks").insert(row);
  if (error) throw error;
}

export async function deleteArtwork(id: string, imagePath: string) {
  const client = await writeClient();
  const { error } = await client.from("artworks").delete().eq("id", id);
  if (error) throw error;
  if (imagePath) await client.storage.from(BUCKET).remove([imagePath]);
}

export async function updateContent(key: string, value: string) {
  const client = await writeClient();
  const { error } = await client
    .from("site_content")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
