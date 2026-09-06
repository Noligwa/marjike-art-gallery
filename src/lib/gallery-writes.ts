import { supabase } from "@/integrations/supabase/client";
import { BUCKET, isExternalActive } from "./gallery";
import {
  extDeleteArtwork,
  extSaveArtwork,
  extUpdateContent,
  extUploadImage,
} from "./external-db.functions";

async function toBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/** Uploads an image to whichever database is live, returning its stored path. */
export async function uploadImage(file: File, path: string): Promise<string> {
  if (await isExternalActive()) {
    const result = await extUploadImage({
      data: {
        path,
        contentType: file.type || "image/jpeg",
        base64: await toBase64(file),
      },
    });
    return result.path;
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function saveArtwork(
  payload: Record<string, unknown>,
  id?: string,
) {
  if (await isExternalActive()) {
    await extSaveArtwork({ data: id ? { id, payload } : { payload } });
    return;
  }
  const row = payload as never;
  const { error } = id
    ? await supabase.from("artworks").update(row).eq("id", id)
    : await supabase.from("artworks").insert(row);
  if (error) throw error;
}

export async function deleteArtwork(id: string, imagePath: string) {
  if (await isExternalActive()) {
    await extDeleteArtwork({ data: { id, imagePath } });
    return;
  }
  const { error } = await supabase.from("artworks").delete().eq("id", id);
  if (error) throw error;
  if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
}

export async function updateContent(key: string, value: string) {
  if (await isExternalActive()) {
    await extUpdateContent({ data: { key, value } });
    return;
  }
  const { error } = await supabase
    .from("site_content")
    .update({ value })
    .eq("key", key);
  if (error) throw error;
}
