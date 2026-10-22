import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getPublicDbTarget } from "./external-db.functions";

export type Artwork = {
  id: string;
  title: string;
  medium: string;
  dimensions: string;
  year: string;
  price: string;
  description: string;
  image_path: string;
  alt_text: string;
  sort_order: number;
  published: boolean;
};

export const BUCKET = "artworks";

type Target = { active: boolean; url: string; publishableKey: string };

let targetPromise: Promise<Target> | null = null;
let externalClient: SupabaseClient | null = null;

/** Which database the site is currently reading from. */
export function getDbTarget(): Promise<Target> {
  if (!targetPromise) {
    targetPromise = getPublicDbTarget().catch(() => ({
      active: false,
      url: "",
      publishableKey: "",
    }));
  }
  return targetPromise;
}

/** Forget the cached target after the artist switches databases. */
export function resetDbTarget() {
  targetPromise = null;
  externalClient = null;
}

const BUILTIN_FLAG = "marjike-builtin-login";

/** True when the studio was opened with /admin?builtin=1 (rescue login). */
export function isBuiltInAuthForced(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(BUILTIN_FLAG) === "1";
}

export function setBuiltInAuthForced(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.sessionStorage.setItem(BUILTIN_FLAG, "1");
  else window.sessionStorage.removeItem(BUILTIN_FLAG);
}

/** The Supabase client the gallery reads through — built-in or the artist's. */
export async function getDataClient(): Promise<SupabaseClient> {
  const target = await getDbTarget();
  if (!target.active) return supabase as unknown as SupabaseClient;
  if (!externalClient) {
    externalClient = createClient(target.url, target.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "marjike-external-auth",
      },
    });
  }
  return externalClient;
}

/**
 * The client that owns the studio login. Once the artist's own database is
 * live, accounts and passwords live there too — unless the rescue login is on.
 */
export async function getAuthClient(): Promise<SupabaseClient> {
  if (isBuiltInAuthForced()) return supabase as unknown as SupabaseClient;
  return getDataClient();
}

/** True when the artist's own database is serving the site. */
export async function isExternalActive() {
  return (await getDbTarget()).active;
}


/**
 * Creates browser-usable URLs for private storage objects. Signing happens on
 * the site's server, so the browser never needs direct access to the bucket.
 */
export async function signImagePaths(
  paths: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  // Files kept on the artist's own web hosting are already full web addresses.
  for (const p of paths) if (/^https?:\/\//i.test(p)) map[p] = p;
  const unique = Array.from(
    new Set(paths.filter((p) => p && !/^https?:\/\//i.test(p))),
  );
  if (unique.length === 0) return map;

  const { signMediaPaths } = await import("./media-sign.functions");
  const signed = await signMediaPaths({ data: { paths: unique } });
  return { ...map, ...signed };
}

/** Signs a single stored image path, or returns "" when there is none. */
export async function signImagePath(path: string): Promise<string> {
  if (!path) return "";
  const map = await signImagePaths([path]);
  return map[path] ?? "";
}

export const signMediaPath = signImagePath;

export async function fetchArtworks(includeUnpublished = false) {


  const client = await getDataClient();
  let query = client
    .from("artworks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeUnpublished) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) throw error;

  const artworks = (data ?? []) as Artwork[];
  const urls = await signImagePaths(artworks.map((a) => a.image_path));
  return artworks.map((artwork) => ({
    ...artwork,
    imageUrl: urls[artwork.image_path] ?? "",
  }));
}

export type ArtworkWithUrl = Awaited<ReturnType<typeof fetchArtworks>>[number];

export type SiteContentRow = {
  key: string;
  label: string;
  value: string;
  multiline: boolean;
  sort_order: number;
};

export async function fetchSiteContent() {
  const client = await getDataClient();
  const { data, error } = await client
    .from("site_content")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteContentRow[];
}

export function toContentMap(rows: SiteContentRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export const artworksQuery = (includeUnpublished = false) => ({
  queryKey: ["artworks", includeUnpublished] as const,
  queryFn: () => fetchArtworks(includeUnpublished),
});

export const siteContentQuery = () => ({
  queryKey: ["site-content"] as const,
  queryFn: fetchSiteContent,
});
