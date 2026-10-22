import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "artworks";
const TTL = 60 * 60 * 24 * 7; // 7 days

// Only gallery media folders may be signed; anything else in the bucket stays
// out of reach for anonymous callers.
const PATH_OK = /^(seed|uploads)\/[\w./-]+$/;

/**
 * Creates browser-usable signed links for stored media. Runs on the server so
 * visitors never need direct read access to the private media bucket — this
 * works for the built-in database and, while it is live, the artist's own.
 */
export const signMediaPaths = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ paths: z.array(z.string()).min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const urls: Record<string, string> = {};
    const paths = Array.from(
      new Set(
        data.paths.filter((p) => PATH_OK.test(p) && !p.includes("..")),
      ),
    ).slice(0, 80);
    if (!paths.length) return urls;

    const { getPublicDbTarget } = await import("./external-db.functions");
    const target = await getPublicDbTarget().catch(() => ({
      active: false,
      url: "",
      publishableKey: "",
    }));

    let client: {
      storage: {
        from: (b: string) => {
          createSignedUrls: (
            p: string[],
            ttl: number,
          ) => Promise<{
            data:
              | { path?: string; signedUrl?: string }[]
              | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    if (target.active && target.url) {
      client = (await import("./external-db.server").then((m) =>
        m.externalClientFromConfig(),
      )).client as unknown as typeof client;
    } else {
      client = (await import("@/integrations/supabase/client.server"))
        .supabaseAdmin as unknown as typeof client;
    }

    const signed = await client.storage
      .from(BUCKET)
      .createSignedUrls(paths, TTL);
    signed.data?.forEach((entry, index) => {
      const path = entry.path ?? paths[index];
      if (path && entry.signedUrl) urls[path] = entry.signedUrl;
    });
    return urls;
  });
