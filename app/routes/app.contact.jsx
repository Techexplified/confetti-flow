import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

// ─── SVG Illustration for Contact Us ──────────────────────────────────────────
function ContactEnvelopeIllustration() {
  return (
    <svg
      width="340"
      height="190"
      viewBox="0 0 340 190"
      fill="none"
      style={{ overflow: "visible" }}
    >
      {/* ── Flight Trail (Dashed loop from left, behind envelope to plane) ── */}
      <path
        d="M 50 135 C 75 138, 85 118, 108 122 C 132 126, 138 145, 160 145 C 190 145, 205 125, 235 115 C 265 105, 280 85, 305 68"
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="2.2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* ── Floating Sparkles and Stars ── */}
      {/* 4-point Golden Star (Left) */}
      <path
        d="M 68 112 Q 68 122 58 122 Q 68 122 68 132 Q 68 122 78 122 Q 68 122 68 112 Z"
        fill="#fbbf24"
      />

      {/* 4-point Pink Sparkle (Top-Left) */}
      <path
        d="M 98 70 Q 98 76 92 76 Q 98 76 98 82 Q 98 76 104 76 Q 98 76 98 70 Z"
        fill="#f472b6"
      />

      {/* 4-point Purple Sparkle (Right) */}
      <path
        d="M 282 128 Q 282 135 275 135 Q 282 135 282 142 Q 282 135 289 135 Q 282 135 282 128 Z"
        fill="#a855f7"
      />

      {/* Tiny colorful accent dots */}
      <circle cx="102" cy="128" r="2.5" fill="#38bdf8" />
      <circle cx="102" cy="100" r="2.2" fill="#818cf8" />
      <circle cx="230" cy="72" r="2.6" fill="#38bdf8" />
      <circle cx="255" cy="120" r="2.5" fill="#34d399" />
      <circle cx="248" cy="138" r="2" fill="#fb7185" />
      <circle cx="250" cy="98" r="1.8" fill="#e9d5ff" />

      {/* ── Open Envelope Structure ── */}
      {/* Back flap (open, pointing upward) */}
      <path
        d="M 115 105 L 170 65 L 225 105 Z"
        fill="#a78bfa"
        opacity="0.9"
      />

      {/* Letter / Note sticking out of envelope */}
      <g filter="url(#letterShadow)">
        <rect
          x="125"
          y="74"
          width="90"
          height="66"
          rx="8"
          fill="#ffffff"
        />
        {/* Soft decorative letter lines */}
        <line x1="140" y1="88" x2="200" y2="88" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        <line x1="140" y1="98" x2="200" y2="98" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        <line x1="140" y1="108" x2="185" y2="108" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />

        {/* Purple Heart Sticker in center of letter */}
        <path
          d="M 170 94 C 170 91.5, 167.5 89.5, 165 89.5 C 162.5 89.5, 161 91.5, 161 93.5 C 161 97.5, 166 101, 170 103.5 C 174 101, 179 97.5, 179 93.5 C 179 91.5, 177.5 89.5, 175 89.5 C 172.5 89.5, 170 91.5, 170 94 Z"
          fill="#8b5cf6"
          transform="translate(170, 93) scale(1.1) translate(-170, -93)"
        />
      </g>

      {/* Envelope Pocket Body (Front) */}
      <g filter="url(#pocketShadow)">
        {/* Envelope background body */}
        <rect
          x="115"
          y="100"
          width="110"
          height="70"
          rx="12"
          fill="url(#envelopeGrad)"
        />

        {/* Front folded flaps (V-shape pocket) */}
        <path
          d="M 115 100 L 170 140 L 225 100"
          fill="none"
          stroke="#c4b5fd"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <path
          d="M 115 170 L 170 126 L 225 170"
          fill="none"
          stroke="#c4b5fd"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>

      {/* ── Origami Paper Plane (Upper-Right) ── */}
      <g transform="translate(295, 62) rotate(-15) scale(0.95)" filter="url(#planeShadow)">
        {/* Right / Top Wing */}
        <path
          d="M 28 0 L -18 -16 L -6 0 Z"
          fill="#a855f7"
        />
        {/* Left / Bottom Wing */}
        <path
          d="M 28 0 L -18 16 L -6 0 Z"
          fill="#7c3aed"
        />
        {/* Center fold / Keel */}
        <path
          d="M 28 0 L -6 0 L -12 12 Z"
          fill="#6d28d9"
        />
        {/* Top fold highlight */}
        <path
          d="M 28 0 L -12 -6 L -6 0 Z"
          fill="#c084fc"
        />
      </g>

      {/* ── Gradients & Shadows ── */}
      <defs>
        <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>

        <filter id="letterShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7c3aed" floodOpacity="0.1" />
        </filter>

        <filter id="pocketShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.15" />
        </filter>

        <filter id="planeShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.25" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Main Contact Us Page ─────────────────────────────────────────────────────
export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const supportEmail = "Hello@explified.com";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(supportEmail);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = supportEmail;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy email: ", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#f1f1f1f1",
        padding: "32px 32px 64px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        boxSizing: "border-box",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── Back Navigation: ← Back to dashboard ────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <Link
            to={`/app${queryStr}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to dashboard
          </Link>
        </div>

        {/* ── Header: Title & Subtitle ────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            Contact Us
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "#64748b",
              marginTop: 6,
              fontWeight: 500,
              marginBottom: 0,
            }}
          >
            We're here to help you make your store more magical.
          </p>
        </div>

        {/* ── Main Contact Card ───────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(90deg, #fff0feff 0%, #F9F9FF 50%, #EDF5FE 100%)",
            borderRadius: 24,
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 4px 20px -2px rgba(99, 102, 241, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
            padding: "54px 32px 48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle soft lavender glow at the top inside of card */}
          <div
            style={{
              position: "absolute",
              top: -80,
              left: "50%",
              transform: "translateX(-50%)",
              width: 480,
              height: 240,
              background: "radial-gradient(circle, rgba(237, 233, 254, 0.65) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Illustration (Envelope + Paper Plane) ──────────────── */}
          <div style={{ position: "relative", zIndex: 1, marginBottom: 18 }}>
            <ContactEnvelopeIllustration />
          </div>

          {/* ── Heading: Write us a mail here ──────────────────────── */}
          <h2
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 16px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Write us a mail here
          </h2>

          {/* ── Interactive Email Pill Button ──────────────────────── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <button
              type="button"
              id="copy-email-btn"
              onClick={handleCopy}
              title="Click to copy email address"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                background: copied ? "#f0fdf4" : "#ede9fe",
                border: copied ? "1px solid #86efac" : "1px solid rgba(196, 181, 253, 0.4)",
                borderRadius: 9999,
                padding: "12px 26px",
                fontSize: 15,
                fontWeight: 600,
                color: copied ? "#15803d" : "#6366f1",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(99, 102, 241, 0.08)",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              <span>{copied ? "Copied to clipboard!" : supportEmail}</span>

              {/* Copy / Checkmark Icon */}
              {copied ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* ── Subtitle: We typically respond within 24 hours. ────── */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: 13,
              color: "#64748b",
              marginTop: 18,
              marginBottom: 0,
              fontWeight: 500,
            }}
          >
            We typically respond within 24 hours.
          </p>
        </div>

      </div>
    </div>
  );
}
