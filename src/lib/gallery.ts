import { supabase } from "@/integrations/supabase/client";

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
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

/** Creates browser-usable URLs for private storage objects. */
export async function signImagePaths(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  data.forEach((entry, index) => {
    const path = entry.path ?? unique[index];
    if (path && entry.signedUrl) map[path] = entry.signedUrl;
  });
  return map;
}

export async function fetchArtworks(includeUnpublished = false) {
  let query = supabase
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
  const { data, error } = await supabase
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
