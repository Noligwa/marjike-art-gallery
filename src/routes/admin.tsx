import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import {
  artworksQuery,
  commissionWorksQuery,
  isBuiltInAuthForced,
  isExternalActive,
  setBuiltInAuthForced,
  signImagePath,
  signMediaPath,
  siteContentQuery,
  type Artwork,
  type ArtworkWithUrl,
  type CommissionWorkWithUrl,
  type SiteContentRow,
} from "@/lib/gallery";
import {
  deleteArtwork,
  deleteCommissionWork,
  saveArtwork,
  saveCommissionWork,
  updateContent,
  uploadImage,
  uploadMedia,
} from "@/lib/gallery-writes";
import { ExternalDbPanel } from "@/components/ExternalDbPanel";
import { StoragePanel } from "@/components/StoragePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ADMIN_EMAILS, isAllowedAdmin } from "@/lib/admins";
import { setAdminPassword } from "@/lib/external-db.functions";
import {
  BODY_FONTS,
  DEFAULT_FONTS,
  DISPLAY_FONTS,
  THEME_KEYS,
  applyTheme,
  loadFonts,
  type ThemeKey,
} from "@/lib/theme";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Studio panel — Marjike" },
      {
        name: "description",
        content: "Private studio panel for managing the Marjike collection.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Studio panel — Marjike" },
      {
        property: "og:description",
        content: "Private studio panel for managing the Marjike collection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const emptyForm = {
  title: "",
  medium: "",
  dimensions: "",
  year: String(new Date().getFullYear()),
  price: "",
  description: "",
  alt_text: "",
  sort_order: 1,
  published: true,
};

function AdminPage() {
  const { client, session, isAdmin, loading } = useAuth();
  const [builtin, setBuiltin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("builtin") === "1" && !isBuiltInAuthForced()) {
      setBuiltInAuthForced(true);
      window.location.replace("/admin");
      return;
    }
    setBuiltin(isBuiltInAuthForced());
  }, []);

  if (loading || !client) {
    return <Shell>Loading…</Shell>;
  }
  if (!session) {
    return <SignIn client={client} builtin={builtin} />;
  }
  if (!isAllowedAdmin(session.user.email)) {
    return (
      <Shell>
        <div className="mx-auto max-w-[520px] rounded-2xl bg-card p-8 ring-1 ring-black/5">
          <h1 className="font-display text-3xl font-medium tracking-tight">
            No access
          </h1>
          <p className="mt-4 text-ink/70">
            {session.user.email} isn't allowed into the studio.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => client.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </Shell>
    );
  }
  if (!isAdmin) {
    return <ClaimAdmin client={client} email={session.user.email ?? ""} />;
  }
  return (
    <AdminDashboard
      client={client}
      email={session.user.email ?? ""}
      builtin={builtin}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper px-6 py-16 font-body text-ink">
      <div className="mx-auto w-full max-w-[900px]">{children}</div>
    </div>
  );
}

function SignIn({
  client,
  builtin,
}: {
  client: SupabaseClient;
  builtin: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const forgot = async () => {
    if (!isAllowedAdmin(email)) {
      toast.error("Enter one of the two studio emails first.");
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your inbox and spam folder.");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAllowedAdmin(email)) {
      toast.error("This email isn't allowed into the studio.");
      return;
    }
    setBusy(true);
    const fn =
      mode === "signin"
        ? client.auth.signInWithPassword({ email, password })
        : client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "signup")
      toast.success("Account created. Check your email if confirmation is on.");
  };


  return (
    <Shell>
      <div className="mx-auto max-w-[420px] rounded-2xl bg-card p-8 ring-1 ring-black/5">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-sun">
          Studio
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-5 mr-4 text-sm text-ink/60 underline-offset-4 hover:text-sun hover:underline"
          onClick={forgot}
        >
          Forgot password?
        </button>
        <button
          type="button"
          className="mt-5 text-sm text-ink/60 underline-offset-4 hover:text-sun hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "First time here? Create an account"
            : "Already have an account? Sign in"}
        </button>
        {builtin ? (
          <p className="mt-6 text-xs text-ink/50">
            Rescue mode: signing in with the built-in account.
          </p>
        ) : (
          <p className="mt-6 text-xs text-ink/50">
            Locked out after switching databases?{" "}
            <a href="/admin?builtin=1" className="text-sun underline">
              Use the built-in login
            </a>
            .
          </p>
        )}
        <div className="mt-8 border-t border-ink/10 pt-5">
          <Link to="/" className="text-sm text-ink/60 hover:text-sun">
            ← Back to the site
          </Link>
        </div>

      </div>
    </Shell>
  );
}

function ClaimAdmin({
  client,
  email,
}: {
  client: SupabaseClient;
  email: string;
}) {
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    const { data, error } = await client.rpc("claim_first_admin");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      toast.success("You're the studio admin now.");
      window.location.reload();
    } else {
      toast.error("An admin already exists for this studio.");
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-[520px] rounded-2xl bg-card p-8 ring-1 ring-black/5">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Almost there
        </h1>
        <p className="mt-4 text-ink/70">
          Signed in as {email}, but this account isn't the studio admin yet. If
          this is the artist's account and no admin exists, claim it below.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={claim} disabled={busy}>
            Claim studio admin
          </Button>
          <Button variant="outline" onClick={() => client.auth.signOut()}>

            Sign out
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function AdminDashboard({
  client,
  email,
  builtin,
}: {
  client: SupabaseClient;
  email: string;
  builtin: boolean;
}) {
  const qc = useQueryClient();
  const { data: external = false } = useQuery({
    queryKey: ["db-external-active"],
    queryFn: isExternalActive,
  });
  const { data: artworks = [] } = useQuery(artworksQuery(true));
  const { data: commissionWorks = [] } = useQuery(commissionWorksQuery(true));
  const { data: contentRows = [] } = useQuery(siteContentQuery());
  const [editing, setEditing] = useState<ArtworkWithUrl | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCommission, setEditingCommission] =
    useState<CommissionWorkWithUrl | null>(null);
  const [creatingCommission, setCreatingCommission] = useState(false);

  const nextOrder =
    artworks.reduce((max, work) => Math.max(max, work.sort_order), 0) + 1;
  const nextCommissionOrder =
    commissionWorks.reduce((max, work) => Math.max(max, work.sort_order), 0) + 1;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["artworks"] });
    void qc.invalidateQueries({ queryKey: ["commission-works"] });
    void qc.invalidateQueries({ queryKey: ["site-content"] });
  };

  return (
    <Shell>
      {builtin && (
        <div className="mb-6 rounded-xl bg-card p-4 text-sm ring-1 ring-sun/40">
          Built-in login (rescue mode). Use this only to change or switch back
          the database connection below.{" "}
          <button
            type="button"
            className="text-sun underline"
            onClick={() => {
              setBuiltInAuthForced(false);
              window.location.replace("/admin");
            }}
          >
            Leave rescue mode
          </button>
        </div>
      )}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sun">Studio</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
            Manage the collection
          </h1>
          <p className="mt-2 text-sm text-ink/60">{email}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="outline">View site</Button>
          </Link>
          <Button variant="outline" onClick={() => client.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </div>


      <section className="rounded-2xl bg-card p-6 ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Artworks ({artworks.length})
          </h2>
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            Add a piece
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {artworks.map((work) => (
            <div
              key={work.id}
              className="flex gap-4 rounded-xl bg-paper p-3 ring-1 ring-black/5"
            >
              <img
                src={work.imageUrl}
                alt={work.alt_text || work.title}
                className="size-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg">{work.title}</p>
                <p className="truncate text-sm text-ink/60">
                  {[work.medium, work.dimensions].filter(Boolean).join(" · ")}
                </p>
                {work.price && (
                  <p className="truncate text-sm text-sun">{work.price}</p>
                )}
                <p className="mt-1 text-xs uppercase tracking-widest text-clay">
                  #{work.sort_order} ·{" "}
                  {work.published ? "Published" : "Hidden"}
                </p>
                <div className="mt-2 flex gap-3 text-sm">
                  <button
                    type="button"
                    className="text-sun hover:underline"
                    onClick={() => {
                      setCreating(false);
                      setEditing(work);
                    }}
                  >
                    Edit
                  </button>
                  <DeleteButton artwork={work} onDone={refresh} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Commission works ({commissionWorks.length})
          </h2>
          <Button
            type="button"
            onClick={() => {
              setEditingCommission(null);
              setCreatingCommission(true);
            }}
          >
            Add a piece
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {commissionWorks.map((work) => (
            <div
              key={work.id}
              className="flex gap-4 rounded-xl bg-paper p-3 ring-1 ring-black/5"
            >
              <img
                src={work.imageUrl}
                alt={work.alt_text || work.title}
                className="size-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg">{work.title}</p>
                <p className="truncate text-sm text-ink/60">
                  {[work.medium, work.dimensions].filter(Boolean).join(" · ")}
                </p>
                {work.price && (
                  <p className="truncate text-sm text-sun">{work.price}</p>
                )}
                <p className="mt-1 text-xs uppercase tracking-widest text-clay">
                  #{work.sort_order} ·{" "}
                  {work.published ? "Published" : "Hidden"}
                </p>
                <div className="mt-2 flex gap-3 text-sm">
                  <button
                    type="button"
                    className="text-sun hover:underline"
                    onClick={() => {
                      setCreatingCommission(false);
                      setEditingCommission(work);
                    }}
                  >
                    Edit
                  </button>
                  <DeleteButton
                    artwork={work}
                    kind="commission"
                    onDone={refresh}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(creating || editing) && (
        <ArtworkForm
          key={editing?.id ?? "new"}
          artwork={editing}
          nextOrder={nextOrder}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}

      {(creatingCommission || editingCommission) && (
        <ArtworkForm
          key={`commission-${editingCommission?.id ?? "new"}`}
          artwork={editingCommission}
          nextOrder={nextCommissionOrder}
          kind="commission"
          onClose={() => {
            setCreatingCommission(false);
            setEditingCommission(null);
          }}
          onSaved={refresh}
        />
      )}

      <InquiryInbox client={client} />

      <ArtistPhotoEditor rows={contentRows} onSaved={refresh} />

      <HeroVideoEditor rows={contentRows} onSaved={refresh} />

      <SiteContentEditor rows={contentRows} onSaved={refresh} />

      <ThemeEditor rows={contentRows} onSaved={refresh} />

      <StoragePanel />

      <PasswordPanel client={client} email={email} builtin={builtin} />

      <ExternalDbPanel onSwitched={refresh} manageable={builtin || !external} />

    </Shell>
  );
}

function HeroVideoEditor({
  rows,
  onSaved,
}: {
  rows: SiteContentRow[];
  onSaved: () => void;
}) {
  const currentPath =
    rows.find((row) => row.key === "hero_video_path")?.value ?? "";
  const [file, setFile] = useState<File | null>(null);
  const [storedPreview, setStoredPreview] = useState("");
  const [localPreview, setLocalPreview] = useState("");

  useEffect(() => {
    let active = true;
    void signMediaPath(currentPath).then((url) => {
      if (active) setStoredPreview(url);
    });
    return () => {
      active = false;
    };
  }, [currentPath]);

  useEffect(() => {
    if (!file) {
      setLocalPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a video.");
      if (!file.type.startsWith("video/")) {
        throw new Error("Please choose a video file.");
      }
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("The video must be smaller than 25 MB.");
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const path = await uploadMedia(
        file,
        `hero/${crypto.randomUUID()}.${ext}`,
      );
      await updateContent("hero_video_path", path);
    },
    onSuccess: () => {
      toast.success("Landing page video updated.");
      setFile(null);
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const preview = localPreview || storedPreview;

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Landing page video
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-start">
        <div className="overflow-hidden rounded-xl bg-paper p-3 ring-1 ring-black/5">
          {preview ? (
            <video
              key={preview}
              src={preview}
              muted
              loop
              playsInline
              controls
              className="aspect-video w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-card text-center text-xs text-ink/50">
              Using the default studio video
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <Field label="Choose a replacement video">
            <Input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <p className="text-sm leading-relaxed text-ink/60">
            MP4 or WebM works best. Maximum file size: 25 MB.
          </p>
          <div>
            <Button
              disabled={!file || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Uploading…" : "Save landing page video"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeleteButton({
  artwork,
  kind = "artwork",
  onDone,
}: {
  artwork: Artwork;
  kind?: "artwork" | "commission";
  onDone: () => void;
}) {
  const remove = async () => {
    if (!window.confirm(`Delete "${artwork.title}"? This can't be undone.`)) {
      return;
    }
    try {
      if (kind === "commission") {
        await deleteCommissionWork(artwork.id, artwork.image_path);
      } else {
        await deleteArtwork(artwork.id, artwork.image_path);
      }
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    toast.success("Piece removed.");
    onDone();
  };

  return (
    <button className="text-ink/50 hover:text-sun" onClick={remove}>
      Delete
    </button>
  );
}

function ArtworkForm({
  artwork,
  nextOrder,
  onClose,
  onSaved,
  kind = "artwork",
}: {
  artwork: ArtworkWithUrl | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
  kind?: "artwork" | "commission";
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState(() =>
    artwork
      ? {
          title: artwork.title,
          medium: artwork.medium,
          dimensions: artwork.dimensions,
          year: artwork.year,
          price: artwork.price ?? "",
          description: artwork.description,
          alt_text: artwork.alt_text,
          sort_order: artwork.sort_order,
          published: artwork.published,
        }
      : { ...emptyForm, sort_order: nextOrder },
  );
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);


  const save = useMutation({
    mutationFn: async () => {
      let imagePath = artwork?.image_path ?? "";

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        imagePath = await uploadImage(
          file,
          `uploads/${crypto.randomUUID()}.${ext}`,
        );
      }

      if (!imagePath) throw new Error("Please choose an image.");

      if (kind === "commission") {
        await saveCommissionWork({ ...form, image_path: imagePath }, artwork?.id);
      } else {
        await saveArtwork({ ...form, image_path: imagePath }, artwork?.id);
      }
    },
    onSuccess: () => {
      toast.success(artwork ? "Piece updated." : "Piece added.");
      onSaved();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section
      ref={sectionRef}
      className="mt-8 scroll-mt-6 rounded-2xl bg-card p-6 ring-1 ring-black/5"
    >
      <h2 className="font-display text-2xl font-medium tracking-tight">
        {artwork ? `Edit "${artwork.title}"` : "Add a piece"}
      </h2>
      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Title">
          <Input
            value={form.title}
            required
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Year">
          <Input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </Field>
        <Field label="Price">
          <Input
            value={form.price}
            placeholder="€ 850"
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Field>
        <Field label="Medium">
          <Input
            value={form.medium}
            placeholder="Oil on linen"
            onChange={(e) => setForm({ ...form, medium: e.target.value })}
          />
        </Field>
        <Field label="Dimensions">
          <Input
            value={form.dimensions}
            placeholder="80 × 100 cm"
            onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Image description (for screen readers)">
            <Input
              value={form.alt_text}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Order on the page (1 = shown first)">
          <Input
            type="number"
            min={1}
            step={1}
            value={form.sort_order}
            onChange={(e) =>
              setForm({
                ...form,
                sort_order: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </Field>
        <div className="flex items-end gap-3 pb-2">
          <Switch
            id="published"
            checked={form.published}
            onCheckedChange={(published) => setForm({ ...form, published })}
          />
          <Label htmlFor="published">Show on the site</Label>
        </div>
        <div className="sm:col-span-2">
          <Field label={artwork ? "Replace image (optional)" : "Image"}>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save piece"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

function ArtistPhotoEditor({
  rows,
  onSaved,
}: {
  rows: SiteContentRow[];
  onSaved: () => void;
}) {
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const currentPath = map["artist_photo_path"] ?? "";

  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    setName(map["artist_photo_name"] ?? "");
    setCaption(map["artist_photo_caption"] ?? "");
    setAlt(map["artist_photo_alt"] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  useEffect(() => {
    let active = true;
    void signImagePath(currentPath).then((url) => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
    };
  }, [currentPath]);

  const save = useMutation({
    mutationFn: async () => {
      let path = currentPath;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        path = await uploadImage(file, `artist/${crypto.randomUUID()}.${ext}`);
      }

      const updates: Array<[string, string]> = [
        ["artist_photo_path", path],
        ["artist_photo_name", name],
        ["artist_photo_caption", caption],
        ["artist_photo_alt", alt],
      ];

      for (const [key, value] of updates) {
        await updateContent(key, value);
      }
    },
    onSuccess: () => {
      toast.success("Artist photo updated.");
      setFile(null);
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Artist photo
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="rounded-xl bg-paper p-3 ring-1 ring-black/5">
          {preview ? (
            <img
              src={preview}
              alt={alt || "Current artist photo"}
              className="aspect-[4/5] w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-card text-center text-xs text-ink/50">
              Using the default photo
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <Field label="Replace the photo">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Name shown under the photo">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Caption">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </Field>
          <Field label="Photo description (for screen readers)">
            <Textarea
              rows={2}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </Field>
          <div>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save artist photo"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteContentEditor({
  rows,
  onSaved,
}: {
  rows: SiteContentRow[];
  onSaved: () => void;
}) {
  const textRows = rows.filter(
    (row) =>
      !row.key.startsWith("artist_photo_") &&
      !row.key.startsWith("theme_") &&
      !row.key.startsWith("storage_") &&
      !row.key.startsWith("font_") &&
      row.key !== "hero_video_path",
  );
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(Object.fromEntries(textRows.map((row) => [row.key, row.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);


  const save = useMutation({
    mutationFn: async () => {
      for (const row of textRows) {
        if (values[row.key] === row.value) continue;
        await updateContent(row.key, values[row.key] ?? "");
      }
    },
    onSuccess: () => {
      toast.success("Site text updated.");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Site text
      </h2>
      <div className="mt-6 grid gap-4">
        {textRows.map((row) => (
          <Field key={row.key} label={row.label}>
            {row.multiline ? (
              <Textarea
                rows={3}
                value={values[row.key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [row.key]: e.target.value })
                }
              />
            ) : (
              <Input
                value={values[row.key] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [row.key]: e.target.value })
                }
              />
            )}
          </Field>
        ))}
      </div>
      <Button
        className="mt-6"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Saving…" : "Save site text"}
      </Button>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ThemeEditor({
  rows,
  onSaved,
}: {
  rows: SiteContentRow[];
  onSaved: () => void;
}) {
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const initial = () => ({
    ...Object.fromEntries(
      (Object.keys(THEME_KEYS) as ThemeKey[]).map((k) => [
        k,
        saved[k] || THEME_KEYS[k].default,
      ]),
    ),
    font_display: saved["font_display"] || DEFAULT_FONTS.font_display,
    font_body: saved["font_body"] || DEFAULT_FONTS.font_body,
  });
  const [values, setValues] = useState<Record<string, string>>(initial);

  useEffect(() => {
    setValues(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  useEffect(() => {
    loadFonts([...DISPLAY_FONTS, ...BODY_FONTS]);
  }, []);

  const update = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    applyTheme(next); // live preview
  };

  const save = useMutation({
    mutationFn: async (next: Record<string, string>) => {
      for (const [key, value] of Object.entries(next)) {
        if ((saved[key] ?? "") === value) continue;
        await updateContent(key, value);
      }
    },
    onSuccess: () => {
      toast.success("Colours and fonts saved.");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reset = () => {
    const defaults = {
      ...Object.fromEntries(
        (Object.keys(THEME_KEYS) as ThemeKey[]).map((k) => [k, THEME_KEYS[k].default]),
      ),
      ...DEFAULT_FONTS,
    };
    setValues(defaults);
    applyTheme(defaults);
  };

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-paper px-3 text-sm";

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Colours & fonts
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Changes preview right away. Press save to make them live for visitors.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(Object.keys(THEME_KEYS) as ThemeKey[]).map((key) => (
          <Field key={key} label={THEME_KEYS[key].label}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label={THEME_KEYS[key].label}
                value={values[key]}
                onChange={(e) => update(key, e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent"
              />
              <Input
                value={values[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </div>
          </Field>
        ))}
        <Field label="Heading font">
          <select
            className={selectClass}
            value={values["font_display"]}
            onChange={(e) => update("font_display", e.target.value)}
          >
            {DISPLAY_FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Body text font">
          <select
            className={selectClass}
            value={values["font_body"]}
            onChange={(e) => update("font_body", e.target.value)}
          >
            {BODY_FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={save.isPending} onClick={() => save.mutate(values)}>
          {save.isPending ? "Saving…" : "Save colours & fonts"}
        </Button>
        <Button variant="outline" onClick={reset}>
          Back to original look
        </Button>
      </div>
    </section>
  );
}

function PasswordPanel({
  client,
  email,
  builtin,
}: {
  client: SupabaseClient;
  email: string;
  builtin: boolean;
}) {
  const setPassword = useServerFn(setAdminPassword);
  const [target, setTarget] = useState(email.toLowerCase());
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Use at least 8 characters.");
      if (password !== confirm) throw new Error("The two passwords don't match.");
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const external = !builtin && (await isExternalActive());
      return setPassword({
        data: {
          accessToken: token,
          target: external ? "external" : "builtin",
          email: target,
          password,
        },
      });
    },
    onSuccess: (result) => {
      setPw("");
      setConfirm("");
      toast.success(
        result.created
          ? `Account created for ${target} with that password.`
          : `Password updated for ${target}.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Studio logins & passwords
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Only these two emails can open the studio. Set a new password for
        yourself or the other person — if their account doesn't exist yet, it's
        created ready to use.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Field label="Login">
          <select
            className="h-10 w-full rounded-md border border-input bg-paper px-3 text-sm"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {ADMIN_EMAILS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        <Field label="Repeat password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </div>
      <Button
        className="mt-6"
        disabled={save.isPending || !password}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Saving…" : "Set password"}
      </Button>
    </section>
  );
}

type InquiryRow = {
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

const STATUS_STYLES: Record<string, string> = {
  new: "rounded-full bg-sun/15 px-2.5 py-0.5 text-xs uppercase tracking-widest text-sun",
  replied:
    "rounded-full bg-ink/5 px-2.5 py-0.5 text-xs uppercase tracking-widest text-ink/60",
  archived:
    "rounded-full bg-ink/5 px-2.5 py-0.5 text-xs uppercase tracking-widest text-clay",
};

function InquiryInbox({ client }: { client: SupabaseClient }) {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: items = [],
    error: listError,
  } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await client
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InquiryRow[];
    },
  });

  const save = async (
    row: InquiryRow,
    patch: Partial<InquiryRow>,
    ok: string,
  ) => {
    setBusyId(row.id);
    const { error } = await client
      .from("inquiries")
      .update(patch as never)
      .eq("id", row.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(ok);
      setOpenId(null);
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["inquiries"] });
    }
  };

  const newCount = items.filter((row) => row.status === "new").length;

  return (
    <section className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Commission inquiries ({items.length}){newCount > 0 ? ` · ${newCount} new` : ""}
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Messages from the commission form on the site. The visitors' email
        addresses stay private — they are only visible here.
      </p>
      {listError &&
        /could not find the table|does not exist|schema cache/i.test(
          listError.message,
        ) && (
          <p className="mt-4 text-sm text-sun">
            Your own database doesn't hold the inbox yet. Open the{" "}
            <strong>My database</strong> section below, copy the setup text
            once more and run it in your project — then this inbox reads and
            writes there.
          </p>
        )}
      {listError &&
        !/could not find the table|does not exist|schema cache/i.test(
          listError.message,
        ) && (
          <p className="mt-4 text-sm text-sun">{listError.message}</p>
        )}
      {!listError && items.length === 0 && (
        <p className="mt-4 text-sm text-ink/60">No messages yet.</p>
      )}
      <div className="mt-6 flex flex-col gap-3">
        {items.map((row) => (
          <div
            key={row.id}
            className="rounded-xl bg-paper p-4 ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {row.name}
                  {row.phone ? ` · ${row.phone}` : ""}
                </p>
                <p className="truncate text-sm text-ink/60">{row.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={STATUS_STYLES[row.status] ?? STATUS_STYLES["replied"]}>
                  {row.status}
                </span>
                <span className="text-xs text-clay">
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
              {row.message}
            </p>
            {row.reply && (
              <div className="mt-3 rounded-lg bg-card p-3 text-sm text-ink/70">
                <span className="text-xs uppercase tracking-widest text-clay">
                  Your reply
                </span>
                <p className="mt-1 whitespace-pre-wrap">{row.reply}</p>
              </div>
            )}
            {openId === row.id ? (
              <div className="mt-3 flex flex-col gap-2">
                <Textarea
                  rows={4}
                  placeholder="Write your reply…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={!draft.trim() || busyId === row.id}
                    onClick={() =>
                      save(
                        row,
                        {
                          reply: draft.trim(),
                          status: "replied",
                          replied_at: new Date().toISOString(),
                        },
                        "Reply saved.",
                      )
                    }
                  >
                    {busyId === row.id ? "Saving…" : "Save reply"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenId(null);
                      setDraft("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-4 text-sm">
                {!row.reply && (
                  <button
                    type="button"
                    className="text-sun hover:underline"
                    onClick={() => {
                      setOpenId(row.id);
                      setDraft("");
                    }}
                  >
                    Reply
                  </button>
                )}
                {row.status === "archived" ? (
                  <button
                    type="button"
                    className="text-ink/60 hover:underline"
                    onClick={() => save(row, { status: "new" }, "Restored.")}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-ink/60 hover:underline"
                    disabled={busyId === row.id}
                    onClick={() =>
                      save(row, { status: "archived" }, "Moved to archive.")
                    }
                  >
                    Archive
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
