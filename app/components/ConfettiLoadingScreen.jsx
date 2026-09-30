import { useState, useEffect } from "react";

// Celebration Party Popper Icon Component
export function PartyPopperIcon({ size = 80, showGlow = true }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {showGlow && (
        <div
          className="absolute -inset-3 rounded-full blur-xl opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(236,72,153,0.5) 0%, rgba(168,85,247,0.4) 50%, rgba(56,189,248,0.3) 100%)",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative transform hover:scale-105 transition-transform duration-300 drop-shadow-md"
      >
        <defs>
          <linearGradient id="coneGrad" x1="20" y1="95" x2="65" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="70%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="stripeGrad" x1="30" y1="85" x2="60" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="blueRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="pinkRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>

        {/* Celebration Cone Body */}
        <path
          d="M24 96 C 22 98, 19 96, 20 93 L 34 50 C 35 47, 39 46, 42 48 L 74 72 C 77 74, 77 78, 74 80 L 29 97 C 27 98, 25 97, 24 96 Z"
          fill="url(#coneGrad)"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
        />

        {/* Cone decorative stripes */}
        <path
          d="M 28 82 L 62 67 C 64 66, 67 68, 65 70 L 35 91 Z"
          fill="url(#stripeGrad)"
          opacity="0.9"
        />
        <path
          d="M 23 93 L 45 83 C 46 82, 48 83, 47 85 L 28 97 Z"
          fill="#38bdf8"
          opacity="0.85"
        />

        {/* Confetti erupting particles & streamers */}
        <path
          d="M 52 46 Q 60 25, 75 32 T 95 20"
          stroke="url(#pinkRibbon)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 64 54 Q 82 45, 88 58 T 106 50"
          stroke="url(#blueRibbon)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 44 38 Q 42 20, 56 16 T 68 8"
          stroke="#fbbf24"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sparkle 4-point stars */}
        <path
          d="M 82 28 Q 82 35, 89 35 Q 82 35, 82 42 Q 82 35, 75 35 Q 82 35, 82 28 Z"
          fill="#fbbf24"
        />
        <path
          d="M 102 38 Q 102 43, 107 43 Q 102 43, 102 48 Q 102 43, 97 43 Q 102 43, 102 38 Z"
          fill="#38bdf8"
        />
        <path
          d="M 56 12 Q 56 16, 60 16 Q 56 16, 56 20 Q 56 16, 52 16 Q 56 16, 56 12 Z"
          fill="#f472b6"
        />
        <path
          d="M 92 68 Q 92 72, 96 72 Q 92 72, 92 76 Q 92 72, 88 72 Q 92 72, 92 68 Z"
          fill="#c084fc"
        />

        {/* Small confetti circular dots */}
        <circle cx="70" cy="40" r="3.5" fill="#f43f5e" />
        <circle cx="50" cy="28" r="2.5" fill="#38bdf8" />
        <circle cx="85" cy="55" r="3" fill="#fbbf24" />
        <circle cx="78" cy="18" r="2.5" fill="#a855f7" />
        <circle cx="100" cy="26" r="2.5" fill="#34d399" />
      </svg>
    </div>
  );
}

// Floating Sparkle Star SVG
export function SparkleStar({ className = "", color = "#fbbf24", size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill={color}
      />
    </svg>
  );
}

// Floating Ribbon Curl SVG
export function RibbonCurl({ className = "", color = "#f472b6" }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 8 32 Q 22 28, 20 18 T 34 8"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ConfettiLoadingScreen({
  title = "Hang on tight!",
  subtitle = "Beautiful confetti are loading!",
  progress: externalProgress,
  autoProgress = true,
  onComplete,
}) {
  const [internalProgress, setInternalProgress] = useState(15);
  const progress = externalProgress !== undefined ? externalProgress : internalProgress;

  useEffect(() => {
    if (externalProgress !== undefined || !autoProgress) return;

    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (!onComplete && prev >= 92) {
          return 92;
        }
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) setTimeout(onComplete, 300);
          return 100;
        }
        const increment = prev < 45 ? 20 : prev < 75 ? 12 : prev < 90 ? 6 : 4;
        const next = Math.min(prev + increment, onComplete ? 100 : 92);
        if (next === 100 && onComplete) {
          setTimeout(onComplete, 350);
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [externalProgress, autoProgress, onComplete]);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#f1f2f4]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        className="relative z-20 w-full max-w-2xl bg-white p-8 sm:p-14 text-center rounded-[32px] shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95"
        style={{
          border: "2px solid transparent",
          backgroundImage:
            "linear-gradient(white, white), linear-gradient(135deg, #f472b6 0%, #c084fc 40%, #38bdf8 100%)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          boxShadow:
            "0 20px 50px -10px rgba(168, 85, 247, 0.22), 0 10px 20px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Floating festive decorations */}
        <SparkleStar
          color="#fbbf24"
          size={22}
          className="absolute top-12 left-14 animate-pulse"
        />
        <SparkleStar
          color="#38bdf8"
          size={18}
          className="absolute top-20 right-16 animate-bounce duration-1000"
        />
        <SparkleStar
          color="#ec4899"
          size={16}
          className="absolute bottom-16 left-20 animate-pulse"
        />
        <RibbonCurl
          color="#38bdf8"
          className="absolute top-1/2 -left-2 transform -rotate-45"
        />
        <RibbonCurl
          color="#f472b6"
          className="absolute top-1/2 -right-2 transform rotate-45"
        />

        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Party Popper Celebration Icon */}
          <div className="p-3 bg-gradient-to-tr from-pink-50 to-purple-50 rounded-3xl border border-purple-100/60 shadow-inner">
            <PartyPopperIcon size={90} />
          </div>

          {/* Main Header */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Hang{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #ec4899 0%, #d946ef 45%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                on tight!
              </span>
            </h1>
            <p className="text-slate-500 font-medium text-base sm:text-lg mt-2">
              {subtitle}
            </p>
          </div>

          {/* Smooth Pill Progress Bar */}
          <div className="w-full max-w-md pt-2">
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #f472b6 0%, #a855f7 50%, #38bdf8 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
