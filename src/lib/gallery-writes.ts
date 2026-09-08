import { supabase } from "@/integrations/supabase/client";
import { BUCKET, getDataClient, isExternalActive } from "./gallery";

/** Writes go to whichever database is live, as the signed-in studio admin. */
async function writeClient() {
  return (await isExternalActive())
    ? await getDataClient()
    : (supabase as unknown as Awaited<ReturnType<typeof getDataClient>>);
}

/** Uploads an image to whichever database is live, returning its stored path. */
export async function uploadImage(file: File, path: string): Promise<string> {
  const client = await writeClient();
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

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
    .update({ value })
    .eq("key", key);
  if (error) throw error;
}
