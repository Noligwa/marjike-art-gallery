import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** AES-256-GCM around the artist's service key. Server-only module. */
function encryptionKey(): Buffer {
  const raw = process.env["EXTERNAL_DB_KEY_SECRET"];
  if (!raw) throw new Error("EXTERNAL_DB_KEY_SECRET is not set");
  // The generated secret is a random string, not base64 — hash it to 32 bytes.
  const buf = Buffer.alloc(32);
  Buffer.from(raw, "utf8").copy(buf);
  return buf;
}

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptKey(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    buf.subarray(0, 12),
  );
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([
    decipher.update(buf.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export type ExternalConfig = {
  url: string;
  publishable_key: string;
  service_key_ciphertext: string;
  service_key_last4: string;
  is_active: boolean;
};

export async function loadExternalConfig(): Promise<ExternalConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("external_db_config")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as ExternalConfig | null) ?? null;
}

/** Service-role client for the artist's own project. */
export function externalAdminClient(
  url: string,
  serviceKey: string,
): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (
          serviceKey.startsWith("sb_") &&
          h.get("Authorization") === `Bearer ${serviceKey}`
        ) {
          h.delete("Authorization");
        }
        h.set("apikey", serviceKey);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function externalClientFromConfig() {
  const config = await loadExternalConfig();
  if (!config?.url || !config.service_key_ciphertext) {
    throw new Error("No database details saved yet.");
  }
  return {
    config,
    client: externalAdminClient(
      config.url,
      decryptKey(config.service_key_ciphertext),
    ),
  };
}
