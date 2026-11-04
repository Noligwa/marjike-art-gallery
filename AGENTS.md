<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store artist-uploaded images and landing-page videos in the existing private `artworks` bucket so one signed-media flow works across both databases.

## Architecture rules
- Signed media links are created only by the server function in `src/lib/media-sign.functions.ts`, restricted to `seed/` and `uploads/` paths in the `artworks` bucket; `storage.objects` must keep no anonymous read policy. Why: the bucket stays closed to direct downloads while working across both the built-in and the artist's database.
- Commission inquiries follow the active database (the artist's own while it is live) and fall back to the built-in database when hers lacks the `inquiries` table; only the two allowlisted admins may read them via RLS. Why: a visitor's message must never be lost while her database is being updated.
- Commission works shown on the Commission section live in `public.commission_works` (same fields and admin flow as `artworks`) and follow the active database through the same read/write helpers. Why: the commission gallery must behave exactly like Selected works on whichever database is live.
- After any change to `src/lib/external-db-sql.ts`, remind the user to re-copy the setup text from the "My database" panel and run it in her own project. Why: her database only gains new tables/permissions when she runs it herself.
- Rescue login (`/admin?builtin=1`) routes every studio read and write to the built-in database, not just the sign-in. Why: writing her live database with a built-in session lands as an anonymous request and fails with "row-level security" errors.
