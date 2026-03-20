import SmartImage from "@thinkgrid/snapbolt/image";
import UploadDemo from "@/components/UploadDemo";
import ServerDemo from "@/components/ServerDemo";

// A real public image to demonstrate URL-based optimization
const HERO_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=90";

const CARD_URL =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=85";

export default function Page() {
  return (
    <main className="container">
      <span className="badge">Snapbolt Demo</span>
      <h1>SmartImage — Drop-in Performance Component</h1>
      <p>
        Import once, use everywhere. Automatic WebP conversion, responsive{" "}
        <code>srcset</code>, lazy loading, blur placeholder, and LCP
        optimization — all in a single component.
      </p>

      <hr className="divider" />

      {/*
        ── HERO IMAGE (LCP) ──────────────────────────────────────────────────
        priority=true:
          - loading="eager" + fetchpriority="high"
          - Injects <link rel="preload"> into <head> immediately
          - Generates srcset [640w, 1080w, 1920w] pointing at snapbolt-server
          - Browser picks the right size; CLS prevented by width+height attrs
      */}
      <div className="section">
        <h2>1. Priority / LCP image</h2>
        <p>
          Use <code>priority</code> on the largest above-the-fold image.
          Snapbolt injects a preload hint and sets{" "}
          <code>fetchpriority="high"</code> so the browser fetches it before
          anything else. This directly improves your Lighthouse LCP score.
        </p>
        <SmartImage
          src={HERO_URL}
          alt="Mountain landscape hero image"
          width={900}
          height={500}
          quality={80}
          format="webp"
          priority
          sizes="(max-width: 768px) 100vw, 900px"
          style={{ borderRadius: 12, width: "100%", height: "auto" }}
        />
        <pre className="code-hint">{`<SmartImage
  src="https://cdn.example.com/hero.jpg"
  alt="Hero"
  width={900}
  height={500}
  priority
/>`}</pre>
      </div>

      {/*
        ── LAZY IMAGE ────────────────────────────────────────────────────────
        Default behaviour: loading="lazy" + decoding="async"
        Browser won't fetch until image enters the viewport.
      */}
      <div className="section">
        <h2>2. Lazy-loaded responsive image</h2>
        <p>
          Without <code>priority</code>, the image is lazy-loaded.{" "}
          <code>sizes</code> tells the browser which srcset entry to pick so it
          never downloads a 4 K image for a 400 px card.
        </p>
        <SmartImage
          src={CARD_URL}
          alt="Forest at dusk"
          width={700}
          quality={75}
          format="webp"
          sizes="(max-width: 768px) 100vw, 700px"
          style={{ borderRadius: 8, width: "100%", height: "auto" }}
        />
        <pre className="code-hint">{`<SmartImage
  src="https://cdn.example.com/forest.jpg"
  alt="Forest at dusk"
  width={700}
  quality={75}
  sizes="(max-width: 768px) 100vw, 700px"
/>`}</pre>
      </div>

      {/*
        ── FILL MODE ────────────────────────────────────────────────────────
        fill=true: absolutely positions the image inside the parent.
        Parent must have position:relative and a defined height.
      */}
      <div className="section">
        <h2>3. Fill mode</h2>
        <p>
          <code>fill</code> works like <code>next/image fill</code> — the image
          covers its parent container. Set <code>position: relative</code> and a
          height on the parent.
        </p>
        <div
          style={{
            position: "relative",
            height: 280,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <SmartImage
            src={HERO_URL}
            alt="Landscape fill example"
            fill
            quality={70}
            format="webp"
          />
        </div>
        <pre className="code-hint">{`<div style={{ position: 'relative', height: 280 }}>
  <SmartImage src="..." alt="" fill quality={70} />
</div>`}</pre>
      </div>

      {/*
        ── PRE-UPLOAD OPTIMIZATION ───────────────────────────────────────────
        When src is a Blob/File, SmartImage falls back to WASM mode.
        The image is optimized in-browser before upload.
      */}
      <div className="section">
        <h2>4. Pre-upload optimization (WASM mode)</h2>
        <p>
          When no <code>serverUrl</code> is configured (or the source is a
          Blob/File), SmartImage falls back to the Rust WASM encoder. Pick a
          JPEG or PNG — it's converted to WebP entirely in your browser.
        </p>
        <UploadDemo />
      </div>

      {/*
        ── INSPECT: WHAT SMARTIMAGE DOES UNDER THE HOOD ─────────────────────
        ServerDemo is a debug tool — not a production pattern.
        It shows the exact URL SmartImage would build automatically,
        lets you tweak params manually, and displays the X-Cache header
        so you can verify the server cache is working.
      */}
      <div className="section">
        <h2>5. Inspect — what SmartImage automates</h2>
        <p>
          Every <code>&lt;SmartImage&gt;</code> with a <code>serverUrl</code>{" "}
          configured builds URLs like the one below automatically — you never
          write them by hand. Use this panel to inspect the raw request,
          experiment with params, and verify the{" "}
          <code>X-Cache: HIT / MISS</code> header once caching kicks in.
        </p>
        <p
          style={{
            fontSize: "0.85rem",
            color: "#6b7280",
            marginTop: "-0.5rem",
          }}
        >
          Start snapbolt-server first: <code>cargo run -p snapbolt-server</code>
          . Set <code>NEXT_PUBLIC_SNAPBOLT_SERVER_URL</code> in{" "}
          <code>.env.local</code> if it&apos;s not on{" "}
          <code>localhost:3000</code>.
        </p>
        <ServerDemo src={HERO_URL} />
      </div>
    </main>
  );
}
