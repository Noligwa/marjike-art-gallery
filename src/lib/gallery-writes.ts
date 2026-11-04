import { supabase } from "@/integrations/supabase/client";
import {
  BUCKET,
  getDataClient,
  isBuiltInAuthForced,
  isExternalActive,
} from "./gallery";

/** Writes go to whichever database is live, as the signed-in studio admin.
 *  In rescue mode everything stays on the site's own database. */
async function writeClient() {
  return (await isExternalActive()) && !isBuiltInAuthForced()
    ? await getDataClient()
    : (supabase as unknown as Awaited<ReturnType<typeof getDataClient>>);
}

/** Turns database security errors into something the studio owner can act on. */
function friendlyDbError(error: { message: string }) {
  if (/row-level security|permission denied/i.test(error.message)) {
    return new Error(
      "The studio couldn't save this because your login on the database has expired. Sign out and sign in again.",
    );
  }
  return new Error(error.message);
}

/** Uploads gallery media to whichever database is live, returning its stored path. */
export type StorageSettings = {
  provider: "cloud" | "cpanel";
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

const SETTING_KEYS = {
  provider: "storage_provider",
  uploadUrl: "storage_cpanel_upload_url",
  publicUrl: "storage_cpanel_public_url",
  key: "storage_cpanel_key",
} as const;

export async function getStorageSettings(): Promise<StorageSettings> {
  const client = await writeClient();
  const { data } = await client.from("private_settings").select("key,value");
  const m = Object.fromEntries(
    ((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]),
  );
  return {
    provider: m[SETTING_KEYS.provider] === "cpanel" ? "cpanel" : "cloud",
    uploadUrl: m[SETTING_KEYS.uploadUrl] ?? "",
    publicUrl: m[SETTING_KEYS.publicUrl] ?? "",
    key: m[SETTING_KEYS.key] ?? "",
  };
}

export async function saveStorageSettings(s: StorageSettings) {
  const client = await writeClient();
  const rows = (Object.keys(SETTING_KEYS) as (keyof StorageSettings)[]).map((k) => ({
    key: SETTING_KEYS[k],
    value: String(s[k] ?? "").trim(),
  }));
  const { error } = await client
    .from("private_settings")
    .upsert(rows as never, { onConflict: "key" });
  if (error) throw friendlyDbError(error);
}

/** Sends a file to the upload script on the artist's web hosting; returns its web address. */
export async function uploadToCpanel(
  s: StorageSettings,
  file: File | Blob,
  path: string,
): Promise<string> {
  if (!s.uploadUrl || !s.key) throw new Error("Web hosting storage is not set up yet.");
  const form = new FormData();
  form.append("file", file, path.split("/").pop() ?? "file");
  form.append("path", path);
  let res: Response;
  try {
    res = await fetch(s.uploadUrl, {
      method: "POST",
      headers: { "X-Upload-Key": s.key },
      body: form,
    });
  } catch {
    throw new Error("Could not reach the upload script on your web hosting.");
  }
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !json?.url) {
    throw new Error(json?.error || `Web hosting upload failed (${res.status}).`);
  }
  if (s.publicUrl && !/^https?:\/\//i.test(json.url)) {
    return s.publicUrl.replace(/\/+$/, "") + "/" + json.url.replace(/^\/+/, "");
  }
  return json.url;
}

export async function uploadMedia(file: File, path: string): Promise<string> {
  const settings = await getStorageSettings().catch(() => null);
  if (settings?.provider === "cpanel") return uploadToCpanel(settings, file, path);
  const client = await writeClient();
  const put = () =>
    client.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message) && (await isExternalActive())&& (await isExternalActive()) !isBuiltInAuthForced() && (await isExternalActive())) {
    // Photo folder missing in the artist's database — create it, then retry.
    const { provisionExternalDb } = await import("./external-db.functions");
    await provisionExternalDb().catch(() => undefined);
    ({ error } = await put());
  }
  if (error) throw friendlyDbError(error);
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
  if (error) throw friendlyDbError(error);
}

export async function saveCommissionWork(
  payload: Record<string, unknown>,
  id?: string,
) {
  const client = await writeClient();
  const row = payload as never;
  const { error } = id
    ? await client.from("commission_works").update(row).eq("id", id)
    : await client.from("commission_works").insert(row);
  if (error) throw friendlyDbError(error);
}

export async function deleteCommissionWork(id: string, imagePath: string) {
  const client = await writeClient();
  const { error } = await client.from("commission_works").delete().eq("id", id);
  if (error) throw friendlyDbError(error);
  if (imagePath && !/^https?:\/\//i.test(imagePath)) await client.storage.from(BUCKET).remove([imagePath]);
}

export async function deleteArtwork(id: string, imagePath: string) {
  const client = await writeClient();
  const { error } = await client.from("artworks").delete().eq("id", id);
  if (error) throw friendlyDbError(error);
  if (imagePath && !/^https?:\/\//i.test(imagePath)) await client.storage.from(BUCKET).remove([imagePath]);
}

export async function updateContent(key: string, value: string) {
  const client = await writeClient();
  const { error } = await client
    .from("site_content")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw friendlyDbError(error);
}
