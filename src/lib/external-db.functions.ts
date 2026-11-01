import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "artworks";

type AuthContext = {
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: string,
          ) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  userId: string;
};

async function assertAdmin(context: AuthContext) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Only the studio owner can do this.");
}

/** Public: which database the site should read from. Keys here are public. */
export const getPublicDbTarget = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { loadExternalConfig } = await import("./external-db.server");
      const config = await loadExternalConfig();
      if (!config?.is_active || !config.url || !config.publishable_key) {
        return { active: false, url: "", publishableKey: "" };
      }
      return {
        active: true,
        url: config.url,
        publishableKey: config.publishable_key,
      };
    } catch {
      return { active: false, url: "", publishableKey: "" };
    }
  },
);

export const getExternalDbStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { loadExternalConfig } = await import("./external-db.server");
    const config = await loadExternalConfig();
    if (!config) {
      return {
        configured: false,
        url: "",
        publishableKey: "",
        last4: "",
        active: false,
        remote: null as null | { artworks: number; content: number },
      };
    }

    let remote: null | { artworks: number; content: number } = null;
    if (config.service_key_ciphertext) {
      try {
        const { externalClientFromConfig } = await import(
          "./external-db.server"
        );
        const { client } = await externalClientFromConfig();
        const a = await client
          .from("artworks")
          .select("id", { count: "exact", head: true });
        const c = await client
          .from("site_content")
          .select("key", { count: "exact", head: true });
        if (!a.error && !c.error) {
          remote = { artworks: a.count ?? 0, content: c.count ?? 0 };
        }
      } catch {
        remote = null;
      }
    }

    return {
      configured: Boolean(config.url && config.service_key_ciphertext),
      url: config.url,
      publishableKey: config.publishable_key,
      last4: config.service_key_last4,
      active: config.is_active,
      remote,
    };
  });

export const saveExternalDb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        url: z.string().url(),
        publishableKey: z.string().min(10),
        serviceKey: z.string().min(10).optional(),
        accessToken: z.string().min(10).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { encryptKey, externalAdminClient, loadExternalConfig, decryptKey } =
      await import("./external-db.server");

    const existing = await loadExternalConfig();
    const serviceKey =
      data.serviceKey ??
      (existing?.service_key_ciphertext
        ? decryptKey(existing.service_key_ciphertext)
        : "");
    if (!serviceKey) throw new Error("Please paste your secret key.");

    const url = data.url.replace(/\/+$/, "");
    const probe = externalAdminClient(url, serviceKey);
    const { error } = await probe.storage.listBuckets();
    if (error) {
      throw new Error(`Could not reach that database: ${error.message}`);
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error: saveError } = await supabaseAdmin
      .from("external_db_config")
      .upsert(
        {
          id: true,
          url,
          publishable_key: data.publishableKey,
          service_key_ciphertext: encryptKey(serviceKey),
          service_key_last4: serviceKey.slice(-4),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (saveError) throw saveError;

    let structure: "built" | "skipped" = "skipped";
    if (data.accessToken) {
      const ref = new URL(url).hostname.split(".")[0];
      const { EXTERNAL_SETUP_SQL } = await import("./external-db-sql");
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: EXTERNAL_SETUP_SQL }),
        },
      );
      if (!res.ok) {
        const text = (await res.text()).slice(0, 300);
        throw new Error(
          `Connected, but building the database structure failed (${res.status}): ${text}`,
        );
      }
      structure = "built";
    }
    return { ok: true, structure };
  });

export const provisionExternalDb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();

    const buckets = await client.storage.listBuckets();
    let bucket: "created" | "exists" | "failed" = "exists";
    if (!buckets.data?.some((b) => b.name === BUCKET)) {
      const { error } = await client.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 26214400,
      });
      bucket = error ? "failed" : "created";
    }

    const missing: string[] = [];
    for (const table of [
      "artworks",
      "site_content",
      "user_roles",
      "inquiries",
      "commission_works",
    ]) {
      const { error } = await client
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) missing.push(table);
    }

    return { bucket, missing };
  });

export const migrateToExternalDb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { client } = await externalClientFromConfig();

    const artworks = await supabaseAdmin.from("artworks").select("*");
    if (artworks.error) throw artworks.error;
    const content = await supabaseAdmin.from("site_content").select("*");
    if (content.error) throw content.error;

    const rows = artworks.data ?? [];
    const upA = await client
      .from("artworks")
      .upsert(rows, { onConflict: "id" });
    if (upA.error) throw new Error(`Artworks: ${upA.error.message}`);

    const upC = await client
      .from("site_content")
      .upsert(content.data ?? [], { onConflict: "key" });
    if (upC.error) throw new Error(`Site text: ${upC.error.message}`);

    const paths = Array.from(
      new Set(
        [
          ...rows.map((r) => r.image_path as string),
          ...(content.data ?? [])
            .filter((r) =>
              ["artist_photo_path", "hero_video_path"].includes(r.key),
            )
            .map((r) => r.value as string),
        ].filter(Boolean),
      ),
    );

    let copied = 0;
    const failed: string[] = [];
    for (const path of paths) {
      const file = await supabaseAdmin.storage.from(BUCKET).download(path);
      if (file.error || !file.data) {
        failed.push(path);
        continue;
      }
      const bytes = new Uint8Array(await file.data.arrayBuffer());
      const { error } = await client.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: file.data.type || "image/jpeg",
          upsert: true,
        });
      if (error) failed.push(path);
      else copied += 1;
    }

    return {
      artworks: rows.length,
      content: (content.data ?? []).length,
      media: copied,
      failed,
    };
  });

export const setExternalDbActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { loadExternalConfig } = await import("./external-db.server");
    const config = await loadExternalConfig();
    if (data.active && !config?.service_key_ciphertext) {
      throw new Error("Save and test your database details first.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("external_db_config")
      .update({ is_active: data.active })
      .eq("id", true);
    if (error) throw error;
    return { active: data.active };
  });

/* ---------- writes routed to the artist's database while it is live ---------- */

export const extSaveArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().optional(),
        payload: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();
    const { error } = data.id
      ? await client.from("artworks").update(data.payload).eq("id", data.id)
      : await client.from("artworks").insert(data.payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const extDeleteArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string(), imagePath: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();
    const { error } = await client.from("artworks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.imagePath) {
      await client.storage.from(BUCKET).remove([data.imagePath]);
    }
    return { ok: true };
  });

export const extUpdateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ key: z.string(), value: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();
    const { error } = await client
      .from("site_content")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const extUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        path: z.string().min(1),
        contentType: z.string().min(1),
        base64: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error } = await client.storage
      .from(BUCKET)
      .upload(data.path, bytes, {
        contentType: data.contentType,
        upsert: true,
      });
    if (error) throw new Error(error.message);
    return { path: data.path };
  });

/** Admin read of the artist's database, including hidden pieces. */
export const extListArtworks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { externalClientFromConfig } = await import("./external-db.server");
    const { client } = await externalClientFromConfig();
    const { data, error } = await client
      .from("artworks")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const raw = (data ?? []) as Array<Record<string, unknown>>;
    const rows = raw.map((r) => ({
      id: String(r["id"] ?? ""),
      title: String(r["title"] ?? ""),
      medium: String(r["medium"] ?? ""),
      dimensions: String(r["dimensions"] ?? ""),
      year: String(r["year"] ?? ""),
      price: String(r["price"] ?? ""),
      description: String(r["description"] ?? ""),
      image_path: String(r["image_path"] ?? ""),
      alt_text: String(r["alt_text"] ?? ""),
      sort_order: Number(r["sort_order"] ?? 0),
      published: Boolean(r["published"]),
    }));
    const paths = Array.from(
      new Set(rows.map((r) => r.image_path).filter(Boolean)),
    );
    const urls: Record<string, string> = {};
    if (paths.length) {
      const signed = await client.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60 * 24 * 7);
      signed.data?.forEach((entry, index) => {
        const path = entry.path ?? paths[index];
        if (path && entry.signedUrl) urls[path] = entry.signedUrl;
      });
    }
    return { rows, urls };
  });

/**
 * Lets either allowed studio admin set a password for themselves or the other
 * admin, on whichever database holds the studio login. Creates the account if
 * it doesn't exist yet (already confirmed, so no email needed).
 */
export const setAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string().min(10),
        target: z.enum(["builtin", "external"]),
        email: z.string().email(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { isAllowedAdmin } = await import("./admins");
    const email = data.email.trim().toLowerCase();
    if (!isAllowedAdmin(email)) throw new Error("That email isn't a studio admin.");

    let admin;
    if (data.target === "external") {
      const { externalClientFromConfig } = await import("./external-db.server");
      admin = (await externalClientFromConfig()).client;
    } else {
      admin = (await import("@/integrations/supabase/client.server"))
        .supabaseAdmin as unknown as typeof admin;
    }
    if (!admin) throw new Error("No database available.");

    const { data: caller, error: callerError } = await admin.auth.getUser(
      data.accessToken,
    );
    if (callerError || !isAllowedAdmin(caller.user?.email)) {
      throw new Error("Only a studio admin can do this.");
    }

    let found: { id: string } | undefined;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (list.users.length < 200) break;
    }

    if (found) {
      const { error } = await admin.auth.admin.updateUserById(found.id, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw error;
      return { created: false };
    }
    const { error } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw error;
    return { created: true };
  });
