import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import artistPortrait from "@/assets/artist-portrait.jpg";
import studioVideo from "@/assets/studio-ambient.mp4.asset.json";
import {
  artworksQuery,
  signImagePath,
  siteContentQuery,
  toContentMap,
  type ArtworkWithUrl,
} from "@/lib/gallery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marjike — Art Portfolio | @marjike_art" },
      {
        name: "description",
        content:
          "Warm, gestural paintings and light studies by Marjike. Browse the full collection, learn about the artist, and commission an original piece.",
      },
      { property: "og:title", content: "Marjike — Art Portfolio" },
      {
        property: "og:description",
        content:
          "Warm, gestural paintings and light studies by Marjike. The full collection, about the artist, and commissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Marjike — Art Portfolio" },
      {
        name: "twitter:description",
        content:
          "Warm, gestural paintings and light studies by Marjike. The full collection, about the artist, and commissions.",
      },
    ],
  }),
  component: Index,
});

const FALLBACK = {
  hero_eyebrow: "Light studies · Mixed media · 2019 — Now",
  hero_title: "I paint the way sunlight lingers on a wall.",
  hero_body:
    "Warm, gestural work made in a small studio in Porto. Each piece begins with a single window and ends somewhere quieter than it started.",
  gallery_title: "Selected works",
  about_title:
    "I work slowly, in small batches, in the hours when the light is most honest.",
  about_body_1: "",
  about_body_2: "",
  commission_title: "Let's make something for your space.",
  commission_body: "",
  contact_email: "studio@marjike.art",
  instagram_url: "https://www.instagram.com/marjike_art/",
  artist_photo_path: "",
  artist_photo_name: "Marjike",
  artist_photo_caption: "In the studio · Porto, late afternoon",
  artist_photo_alt:
    "Portrait of Marjike in her Porto studio, wearing a linen shirt in warm afternoon light",
};

function Index() {
  const { data: artworks = [], isLoading } = useQuery(artworksQuery());
  const { data: contentRows } = useQuery(siteContentQuery());
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const content = { ...FALLBACK, ...toContentMap(contentRows ?? []) };
  const active = openIndex === null ? null : (artworks[openIndex] ?? null);

  const { data: portraitUrl } = useQuery({
    queryKey: ["artist-photo", content.artist_photo_path],
    queryFn: () => signImagePath(content.artist_photo_path),
    enabled: Boolean(content.artist_photo_path),
  });


  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-7 sm:px-10">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-tight">
            Marjike
          </span>
          <span className="text-xs uppercase tracking-[0.25em] text-clay">
            Studio
          </span>
        </div>
        <nav className="hidden items-center gap-9 text-sm text-ink/70 sm:flex">
          <a href="#work" className="hover:text-sun">
            Collection
          </a>
          <a href="#about" className="hover:text-sun">
            About
          </a>
          <a href="#commission" className="hover:text-sun">
            Commission
          </a>
          <Link to="/admin" className="text-ink/40 hover:text-sun">
            Studio login
          </Link>
        </nav>
        <a
          href={content.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-[0.15em] text-ink/70 hover:border-sun hover:text-sun"
        >
          @marjike_art
        </a>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <video
          src={studioVideo.url}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-paper/80" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1200px] px-6 pb-16 pt-8 sm:px-10 sm:pt-14">
          <p className="animate-fade-up mb-6 text-xs uppercase tracking-[0.3em] text-sun">
            {content.hero_eyebrow}
          </p>
          <h1 className="animate-fade-up max-w-[20ch] font-display text-6xl font-medium leading-[1.02] tracking-tight text-balance sm:text-7xl lg:text-8xl">
            {content.hero_title}
          </h1>
          <p className="animate-fade-up mt-8 max-w-[52ch] text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
            {content.hero_body}
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#work"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper ring-1 ring-inset ring-ink hover:bg-sun hover:ring-sun"
            >
              View the collection
            </a>
            <a
              href="#commission"
              className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink/80 hover:border-ink"
            >
              Commission a piece
            </a>
          </div>
        </div>
      </section>

      {/* Collection */}
      <section id="work" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10">
        <div className="mb-12 flex items-end justify-between border-b border-ink/10 pb-5">
          <h2 className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            {content.gallery_title}
          </h2>
          <span className="text-xs uppercase tracking-[0.2em] text-clay">
            {artworks.length} {artworks.length === 1 ? "piece" : "pieces"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-xl bg-card"
              />
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <p className="text-ink/60">
            No pieces published yet. Add work from the studio panel.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-3">
            {artworks.map((work, index) => (
              <button
                key={work.id}
                type="button"
                onClick={() => setOpenIndex(index)}
                className="artwork-card group block rounded-xl bg-card p-3 text-left ring-1 ring-black/5"
                aria-label={`Open ${work.title}`}
              >
                <div className="overflow-hidden rounded-[10px]">
                  <img
                    src={work.imageUrl}
                    alt={work.alt_text || work.title}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover outline-1 -outline-offset-1 outline-black/5 transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-1 pb-1 pt-4">
                  <h3 className="font-display text-lg font-medium tracking-tight">
                    {work.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">
                    {[work.medium, work.dimensions].filter(Boolean).join(" · ")}
                  </p>
                  {work.price && (
                    <p className="mt-2 text-sm font-medium text-sun">
                      {work.price}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {active && (
        <Lightbox
          artwork={active}
          onClose={() => setOpenIndex(null)}
          onPrev={() =>
            setOpenIndex((i) =>
              i === null ? i : (i - 1 + artworks.length) % artworks.length,
            )
          }
          onNext={() =>
            setOpenIndex((i) => (i === null ? i : (i + 1) % artworks.length))
          }
        />
      )}

      {/* About */}
      <section id="about" className="bg-card">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <figure className="artwork-card mx-auto max-w-[420px] rounded-xl bg-paper p-3 ring-1 ring-black/5 lg:mx-0">
              <img
                src={artistPortrait}
                alt="Portrait of Marjike in her Porto studio, wearing a linen shirt in warm afternoon light"
                width={1024}
                height={1280}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-[10px] object-cover outline-1 -outline-offset-1 outline-black/5"
              />
              <figcaption className="px-1 pb-1 pt-4">
                <h3 className="font-display text-lg font-medium tracking-tight">
                  Marjike
                </h3>
                <p className="mt-1 text-sm text-ink/60">
                  In the studio · Porto, late afternoon
                </p>
              </figcaption>
            </figure>
            <div>
              <p className="mb-6 text-xs uppercase tracking-[0.3em] text-sun">
                About the artist
              </p>
              <h2 className="max-w-[30ch] font-display text-4xl font-medium leading-[1.08] tracking-tight text-balance sm:text-5xl">
                {content.about_title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
                {content.about_body_1}
              </p>
              <p className="mt-5 text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
                {content.about_body_2}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commission */}
      <section
        id="commission"
        className="mx-auto max-w-[1200px] px-6 py-24 sm:px-10"
      >
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="mb-6 text-xs uppercase tracking-[0.3em] text-sun">
              Commission
            </p>
            <h2 className="font-display text-4xl font-medium leading-[1.08] tracking-tight text-balance sm:text-5xl">
              {content.commission_title}
            </h2>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
              {content.commission_body}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <a
              href={`mailto:${content.contact_email}`}
              className="rounded-full bg-ink px-7 py-4 text-center text-sm font-medium text-paper ring-1 ring-inset ring-ink hover:bg-sun hover:ring-sun"
            >
              {content.contact_email}
            </a>
            <a
              href={content.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ink/20 px-7 py-4 text-center text-sm font-medium text-ink/80 hover:border-sun hover:text-sun"
            >
              Follow the studio on Instagram
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink/55 sm:flex-row sm:px-10">
          <span className="font-display text-base text-ink/80">
            Marjike · Studio, Porto
          </span>
          <a
            href={content.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sun"
          >
            @marjike_art
          </a>
          <Link to="/admin" className="hover:text-sun">
            Studio panel
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Lightbox({
  artwork,
  onClose,
  onPrev,
  onNext,
}: {
  artwork: ArtworkWithUrl;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={artwork.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[90vh] w-full max-w-[1050px] gap-6 overflow-y-auto rounded-2xl bg-paper p-4 sm:p-6 lg:grid-cols-[1.35fr_1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={artwork.imageUrl}
          alt={artwork.alt_text || artwork.title}
          className="max-h-[78vh] w-full rounded-xl object-contain"
        />
        <div className="flex flex-col justify-center pr-1 sm:pr-4">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sun">
            {artwork.year}
          </p>
          <h3 className="font-display text-3xl font-medium leading-tight tracking-tight text-balance sm:text-4xl">
            {artwork.title}
          </h3>
          <p className="mt-3 text-sm text-ink/60">
            {[artwork.medium, artwork.dimensions].filter(Boolean).join(" · ")}
          </p>
          {artwork.description && (
            <p className="mt-6 text-base leading-relaxed text-ink/75 text-pretty">
              {artwork.description}
            </p>
          )}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous piece"
              className="rounded-full border border-ink/20 p-2 hover:border-sun hover:text-sun"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next piece"
              className="rounded-full border border-ink/20 p-2 hover:border-sun hover:text-sun"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full bg-paper/90 p-2 text-ink/70 ring-1 ring-ink/10 hover:text-sun"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
