# Move the gallery onto your own database

Add a "My database" section to the studio panel where you paste your own project's details, run a one-click move of everything (artworks, site text and all photos), and from then on the website reads and writes to your project instead of the built-in one.

## What you'll see in the studio panel

A new section, below the artist photo, with:

1. **Three fields** — your project address (`https://lzgqejxehnktggjhgase.supabase.co`), your public key, and your secret key.
2. **Test connection** — checks the details work before anything else happens.
3. **Set up my database** — creates the artworks table, site-text table, admin-permission table and the photo folder in your project, with the same access rules as today.
4. **Copy everything over** — copies all 9 artworks, all the site text, and every photo file into your project. Safe to run twice; it updates instead of duplicating.
5. **Use my database for the live site** — a switch. Off means nothing changes. On means the public gallery and the studio panel read and write your project from that moment.
6. A status line showing which database is currently live, and how many artworks and photos are in each.

Your secret key is sent straight to the server, encrypted, and never shown again — the panel only ever displays the last four characters so you can tell which key is saved.

## What stays on Lovable

**Your login.** Passwords can't be copied between projects, so signing in to the studio keeps happening on the Lovable side. Everything the site actually shows — artworks, prices, text, photos — moves to your database. If you later want the login on your project too, that's a separate step: you'd create the admin account fresh there.

The website itself also keeps running on Lovable hosting; this change is about where your content lives, not where the pages are served from.

## Risks worth knowing

- Your project needs enough storage for the photos (currently a few MB, so fine).
- If your project goes offline or the key is rotated, the gallery goes blank. The switch can be flipped back to the built-in database at any time, and the built-in copy is left untouched as a fallback.
- Signed photo links from your project expire after 7 days and are regenerated automatically, same as today.

## Technical details

**Storing the credentials**
- New Lovable Cloud table `external_db_config` (single row): `url`, `publishable_key`, `service_key_ciphertext`, `service_key_last4`, `is_active`, timestamps. `GRANT` to `service_role` only, RLS on, no `anon`/`authenticated` policies — the browser never reads it.
- Encryption with `node:crypto` AES-256-GCM in `src/lib/external-db-crypto.server.ts`, key from a generated secret `EXTERNAL_DB_KEY_SECRET`.

**Server functions** (`src/lib/external-db.functions.ts`, all `.middleware([requireSupabaseAuth])` + `has_role(uid,'admin')` check inside the handler; `client.server` imported inside handlers only):
- `saveExternalDb` — validates with Zod, tests a round-trip query, encrypts and upserts.
- `getExternalDbStatus` — returns url, last4, active flag, row/file counts for both sides. Never returns the key.
- `provisionExternalDb` — runs the schema DDL against the target project (tables, `app_role` enum, `has_role`, `updated_at` trigger, grants, RLS policies, private `artworks` bucket + storage policies) via its service key.
- `migrateToExternalDb` — upserts `artworks` and `site_content` rows by id/key, downloads each storage object from the Lovable bucket and uploads it to the target bucket at the same path; returns a per-item report.
- `setExternalDbActive` — flips `is_active`.

**Runtime client switch**
- `src/lib/gallery.ts` gains `getDataClient()`: reads a small public config (url + publishable key + active flag, exposed by an unauthenticated `getPublicDbTarget` server fn, cached in the query client) and returns either the generated Lovable client or a `createClient<Database>` pointed at the external project. All existing readers (`fetchArtworks`, `fetchSiteContent`, `signImagePaths`) and the admin mutations go through it, so no call sites change shape.
- Writes and uploads from the studio panel run through the same client. Because the external project's RLS keys off its own `auth.uid()` and the session lives on Lovable, admin writes to the external project route through a server function using the service key rather than the browser client.
- `src/routes/index.tsx` is unchanged apart from the client swap happening inside `gallery.ts`.

**Migration**
- One Lovable Cloud migration for `external_db_config` (+ grants, RLS). The external project's schema is created at runtime by `provisionExternalDb`, not by a Lovable migration.
