import { createFileRoute } from "@tanstack/react-router";

import artMorningKitchen from "@/assets/art-morning-kitchen.jpg";
import artFieldNoon from "@/assets/art-field-noon.jpg";
import artFigure from "@/assets/art-figure.jpg";
import artWindow from "@/assets/art-window.jpg";
import artPears from "@/assets/art-pears.jpg";
import artDusk from "@/assets/art-dusk.jpg";
import studioVideo from "@/assets/studio-ambient.mp4.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marjike — Art Portfolio | @marjike_art" },
      {
        name: "description",
        content:
          "Warm, gestural paintings and light studies by Marjike. View selected works, learn about the artist, and commission an original piece.",
      },
      { property: "og:title", content: "Marjike — Art Portfolio" },
      {
        property: "og:description",
        content:
          "Warm, gestural paintings and light studies by Marjike. Selected works, about the artist, and commissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Marjike — Art Portfolio" },
      {
        name: "twitter:description",
        content:
          "Warm, gestural paintings and light studies by Marjike. Selected works, about the artist, and commissions.",
      },
    ],
  }),
  component: Index,
});

const INSTAGRAM_URL = "https://www.instagram.com/marjike_art/";

const works = [
  {
    src: artMorningKitchen,
    width: 1024,
    height: 1280,
    title: "Morning, Kitchen North",
    detail: "Oil on linen · 80 × 100 cm",
    alt: "Warm abstract gesture painting with ochre and soft red washes on textured canvas",
  },
  {
    src: artFieldNoon,
    width: 1024,
    height: 800,
    title: "Field at Noon",
    detail: "Acrylic on panel · 60 × 75 cm",
    alt: "Soft warm landscape painting of sunlit fields in muted gold and terracotta",
  },
  {
    src: artFigure,
    width: 1024,
    height: 1024,
    title: "Figure, Unnamed",
    detail: "Gouache & pastel · 50 × 50 cm",
    alt: "Expressive figure study in warm clay tones with gestural brushwork",
  },
  {
    src: artWindow,
    width: 1024,
    height: 1408,
    title: "Window 04",
    detail: "Oil on canvas · 100 × 140 cm",
    alt: "Abstract interior painting with a single tall window of pale light and warm shadows",
  },
  {
    src: artPears,
    width: 1024,
    height: 896,
    title: "Still, Two Pears",
    detail: "Oil on linen · 45 × 55 cm",
    alt: "Warm still life painting of two pears and folded cloth in honey and rust tones",
  },
  {
    src: artDusk,
    width: 1024,
    height: 1152,
    title: "Dusk, Studio Door",
    detail: "Mixed media on board · 70 × 88 cm",
    alt: "Layered abstract painting in dusty rose and cream with textured impasto",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-paper font-body text-ink">
      {/* Header */}
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
            Work
          </a>
          <a href="#about" className="hover:text-sun">
            About
          </a>
          <a href="#commission" className="hover:text-sun">
            Commission
          </a>
        </nav>
        <a
          href={INSTAGRAM_URL}
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
            Light studies · Mixed media · 2019 — Now
          </p>
          <h1 className="animate-fade-up max-w-[20ch] font-display text-6xl font-medium leading-[1.02] tracking-tight text-balance sm:text-7xl lg:text-8xl">
            I paint the way <span className="italic text-sun">sunlight</span>{" "}
            lingers on a wall.
          </h1>
          <p className="animate-fade-up mt-8 max-w-[52ch] text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
            Warm, gestural work made in a small studio in Porto. Each piece
            begins with a single window and ends somewhere quieter than it
            started.
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#work"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper ring-1 ring-inset ring-ink hover:bg-sun hover:ring-sun"
            >
              View the gallery
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

      {/* Gallery */}
      <section id="work" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10">
        <div className="mb-12 flex items-end justify-between border-b border-ink/10 pb-5">
          <h2 className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Selected works
          </h2>
          <span className="text-xs uppercase tracking-[0.2em] text-clay">
            6 pieces · 2024
          </span>
        </div>
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {works.map((work) => (
            <figure key={work.title} className="mb-6 break-inside-avoid">
              <div className="artwork-card rounded-xl bg-card p-3 ring-1 ring-black/5">
                <img
                  src={work.src}
                  alt={work.alt}
                  width={work.width}
                  height={work.height}
                  loading="lazy"
                  className="w-full rounded-[10px] outline-1 -outline-offset-1 outline-black/5"
                />
                <figcaption className="px-1 pb-1 pt-4">
                  <h3 className="font-display text-lg font-medium tracking-tight">
                    {work.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">{work.detail}</p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-card">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="max-w-[30ch]">
              <p className="mb-6 text-xs uppercase tracking-[0.3em] text-sun">
                About the artist
              </p>
              <h2 className="font-display text-4xl font-medium leading-[1.08] tracking-tight text-balance sm:text-5xl">
                I work slowly, in small batches, in the hours when the light is
                most honest.
              </h2>
            </div>
            <div>
              <p className="text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
                Marjike has painted in her Porto studio since 2019, building a
                quiet body of work around light, gesture, and the warm colours
                of a room at the end of the day. Her pieces have shown in small
                group exhibitions across the northwest and live in private
                collections across Europe.
              </p>
              <p className="mt-5 text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
                She welcomes commissions for light studies and gesture figures —
                a short series, each one made by hand and finished in the
                studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commission CTA */}
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
              Let's make something for your space.
            </h2>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-ink/70 text-pretty sm:text-lg">
              Commissions open for the coming season. Tell me about the room,
              the light, and the feeling you're after — I'll reply within a few
              days with a sketch and a plan.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <a
              href="mailto:studio@marjike.art"
              className="rounded-full bg-ink px-7 py-4 text-center text-sm font-medium text-paper ring-1 ring-inset ring-ink hover:bg-sun hover:ring-sun"
            >
              studio@marjike.art
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ink/20 px-7 py-4 text-center text-sm font-medium text-ink/80 hover:border-sun hover:text-sun"
            >
              Follow the studio on Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink/55 sm:flex-row sm:px-10">
          <span className="font-display text-base text-ink/80">
            Marjike · Studio, Porto
          </span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sun"
          >
            @marjike_art
          </a>
          <span>Made by hand, 2024</span>
        </div>
      </footer>
    </div>
  );
}
