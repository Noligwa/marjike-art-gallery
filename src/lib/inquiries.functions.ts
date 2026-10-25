import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  reply: string;
  status: string;
  created_at: string;
  replied_at: string | null;
};

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

/** The database holding the inbox — the artist's own while it is live. */
async function inquiryClient() {
  const { getPublicDbTarget } = await import("./external-db.functions");
  const target = await getPublicDbTarget().catch(() => ({
    active: false,
    url: "",
    publishableKey: "",
  }));
  if (target.active && target.url) {
    const { externalClientFromConfig } = await import("./external-db.server");
    return (await externalClientFromConfig()).client;
  }
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  return supabaseAdmin;
}

const recentSubmissions = new Map<string, number>();

/** Public: a visitor asks about a commission. Stores the message in the studio inbox. */
export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(200),
        phone: z.string().trim().max(60).optional().default(""),
        message: z.string().trim().min(10).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // One message per visitor per minute keeps the inbox clean of spam bursts.
    const request = getRequest();
    const ip =
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const now = Date.now();
    if (now - (recentSubmissions.get(ip) ?? 0) < 60_000) {
      throw new Error(
        "Please wait a minute before sending another message.",
      );
    }

    const row = {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone ?? "",
      message: data.message,
    };

    const client = await inquiryClient();
    const { error } = await client.from("inquiries").insert(row);

    if (
      error &&
      /could not find the table|does not exist|schema cache/i.test(
        error.message,
      )
    ) {
      // The artist's database doesn't hold the inbox yet — keep the message
      // safe in the site's own database instead of losing it.
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { error: fallbackError } = await supabaseAdmin
        .from("inquiries")
        .insert(row);
      if (fallbackError) throw new Error(fallbackError.message);
    } else if (error) {
      throw new Error(error.message);
    }
    return { ok: true };
  });
