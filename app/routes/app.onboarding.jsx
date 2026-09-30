import { useState, useEffect } from "react";
import { redirect, useLoaderData, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  let shopRecord = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });

  if (!shopRecord) {
    shopRecord = await prisma.shop.create({
      data: {
        shop: session.shop,
        isOnboarded: false,
      },
    });
  }

  // If already onboarded and no force parameter, redirect to main dashboard
  if (shopRecord.isOnboarded && !url.searchParams.get("force")) {
    const searchParams = url.searchParams.toString();
    throw redirect(`/app${searchParams ? `?${searchParams}` : ""}`);
  }

  return {
    shop: session.shop,
    isOnboarded: shopRecord.isOnboarded,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "complete") {
    await prisma.shop.upsert({
      where: { shop: session.shop },
      update: { isOnboarded: true },
      create: { shop: session.shop, isOnboarded: true },
    });

    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    return redirect(`/app${searchParams ? `?${searchParams}` : ""}`);
  }

  return null;
};

// Celebration Party Popper Icon Component
function PartyPopperIcon({ size = 80, showGlow = true }) {
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
function SparkleStar({ className = "", color = "#fbbf24", size = 20 }) {
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
function RibbonCurl({ className = "", color = "#f472b6" }) {
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

export default function Onboarding() {
  const { shop } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  // State: "loading" -> "welcome" -> "setup"
  const [step, setStep] = useState("loading");
  const [progress, setProgress] = useState(15);

  // Screen 1: Progress bar transition
  useEffect(() => {
    if (step !== "loading") return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("welcome"), 400);
          return 100;
        }
        return prev + 20;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [step]);

  // Click handler for "Open Theme Editor" - navigates in the same window, does NOT open a new link/tab
  const handleOpenThemeEditor = async () => {
    const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps`;

    // Complete onboarding in the database before navigating
    const formData = new FormData();
    formData.append("intent", "complete");

    try {
      await fetch(window.location.href, {
        method: "POST",
        body: formData,
      });
    } catch (e) {
      console.error("Failed to save onboarding state:", e);
    }

    // Navigate the current window directly without opening a new tab
    if (typeof window !== "undefined") {
      if (window.top) {
        window.top.location.href = themeEditorUrl;
      } else {
        window.location.href = themeEditorUrl;
      }
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#f1f2f4]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ========================================================= */}
      {/* SCREEN 1: LOADING STATE ("Hang on tight!")                */}
      {/* ========================================================= */}
      {step === "loading" && (
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
                Beautiful confetti are loading!
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

            {/* Skip button for instant preview */}
            {/* <button
              onClick={() => setStep("welcome")}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors pt-2 cursor-pointer"
            >
              Skip waiting →
            </button> */}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SCREEN 2: "Welcome to Confetti Flow!" MODAL           */}
      {/* ===================================================== */}
      {step === "welcome" && (
        <div
          className="relative z-20 w-full max-w-lg bg-white p-8 sm:p-10 rounded-[32px] text-center shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{
            border: "2px solid transparent",
            backgroundImage:
              "linear-gradient(white, white), linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #38bdf8 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            boxShadow:
              "0 25px 60px -15px rgba(236, 72, 153, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Corner decorative sparkles & ribbons */}
          <SparkleStar
            color="#fbbf24"
            size={22}
            className="absolute top-6 left-8"
          />
          <SparkleStar
            color="#f472b6"
            size={18}
            className="absolute top-16 left-5"
          />
          <SparkleStar
            color="#38bdf8"
            size={20}
            className="absolute top-8 right-8"
          />
          <SparkleStar
            color="#fbbf24"
            size={18}
            className="absolute bottom-16 right-7"
          />
          <SparkleStar
            color="#f472b6"
            size={16}
            className="absolute bottom-6 right-16"
          />
          <RibbonCurl
            color="#fbbf24"
            className="absolute top-7 left-12 transform -rotate-12"
          />
          <RibbonCurl
            color="#f472b6"
            className="absolute top-7 right-12 transform rotate-45"
          />
          <RibbonCurl
            color="#38bdf8"
            className="absolute bottom-12 left-6 transform rotate-90"
          />
          <RibbonCurl
            color="#f472b6"
            className="absolute bottom-8 right-6 transform -rotate-45"
          />

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <PartyPopperIcon size={84} />
          </div>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Welcome to
          </h2>
          <h1
            className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #ec4899 0%, #a855f7 45%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Confetti Flow!
          </h1>

          {/* Description */}
          <p className="text-slate-600 text-sm sm:text-base mt-4 px-4 leading-relaxed">
            Add delightful confetti animations to your store that trigger on
            specific events and make every moment feel special.
          </p>

          {/* Action Button: Continue */}
          <div className="mt-8">
            <button
              onClick={() => setStep("setup")}
              className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center px-8 py-3.5 rounded-2xl text-white font-semibold text-base shadow-lg transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
              style={{
                background:
                  "linear-gradient(90deg, #f472b6 0%, #a855f7 50%, #38bdf8 100%)",
                boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.4)",
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SCREEN 3: SECOND ONBOARDING BOX ("Let's Set Up Confetti!") */}
      {/* ===================================================== */}
      {step === "setup" && (
        <div
          className="relative z-20 w-full max-w-[530px] bg-white p-8 sm:p-11 rounded-[32px] shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{
            border: "2px solid transparent",
            backgroundImage:
              "linear-gradient(white, white), linear-gradient(135deg, #f472b6 0%, #c084fc 45%, #38bdf8 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            boxShadow:
              "0 25px 60px -15px rgba(168, 85, 247, 0.22), 0 0 30px rgba(236, 72, 153, 0.12)",
          }}
        >
          {/* Floating 4-Point Stars (matching screenshot positions) */}
          {/* Top-left pink star */}
          <SparkleStar
            color="#f472b6"
            size={20}
            className="absolute top-8 left-7 animate-pulse"
          />
          {/* Top-left gold star slightly below */}
          <SparkleStar
            color="#fbbf24"
            size={16}
            className="absolute top-16 left-9"
          />
          {/* Top-right lavender star */}
          <SparkleStar
            color="#a78bfa"
            size={20}
            className="absolute top-9 right-8 animate-pulse"
          />
          {/* Bottom-left sky-blue star */}
          <SparkleStar
            color="#38bdf8"
            size={20}
            className="absolute bottom-10 left-7"
          />
          {/* Bottom-right gold star */}
          <SparkleStar
            color="#fbbf24"
            size={20}
            className="absolute bottom-12 right-8 animate-pulse"
          />

          {/* Header with celebration cone icon */}
          <div className="flex flex-col items-center text-center">
            <PartyPopperIcon size={80} />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
              Let’s Set Up{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #c084fc 0%, #ec4899 50%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Confetti!
              </span>
            </h1>
            <p className="text-slate-500 font-semibold text-sm sm:text-base mt-1.5">
              Enable Confetti on Your Storefront
            </p>
          </div>

          {/* 5 Numbered Setup Steps */}
          <div className="mt-7 space-y-3.5 px-2 sm:px-6">
            {[
              {
                num: "1",
                title: "Click Open Theme Editor.",
                subtext: null,
              },
              {
                num: "2",
                title: "Click Edit theme.",
                subtext: null,
              },
              {
                num: "3",
                title: "Open App embeds from the sidebar.",
                subtext: "Enable Confetti Maker – App Embed.",
              },
              {
                num: "4",
                title: "Click Save.",
                subtext: null,
              },
              {
                num: "5",
                title: "Reload your storefront to test the confetti event.",
                subtext: null,
              },
            ].map((item) => (
              <div key={item.num} className="flex items-start space-x-3.5">
                {/* Lavender Badge Pill */}
                <div
                  className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7e22ce] font-bold text-sm flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    boxShadow: "0 2px 8px rgba(168, 85, 247, 0.15)",
                  }}
                >
                  {item.num}
                </div>
                {/* Step Content */}
                <div className="text-left">
                  <p className="text-slate-800 font-semibold text-sm sm:text-[15px] leading-snug">
                    {item.title}
                  </p>
                  {item.subtext && (
                    <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-normal">
                      {item.subtext}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cheerful completion notice */}
          <p className="text-center text-xs sm:text-sm text-slate-600 font-medium mt-6 mb-6">
            and you are ready to make bright colorful confettis! 🎉
          </p>

          {/* Single Primary Action Button matching user design */}
          <div className="flex flex-col items-center justify-center px-2 sm:px-6">
            <button
              onClick={handleOpenThemeEditor}
              type="button"
              disabled={isSubmitting}
              className="w-full py-3.5 px-8 rounded-2xl text-white font-semibold text-base shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(90deg, #f472b6 0%, #a855f7 45%, #38bdf8 100%)",
                boxShadow:
                  "0 10px 25px -5px rgba(236, 72, 153, 0.4), 0 8px 16px -6px rgba(56, 189, 248, 0.35)",
              }}
            >
              <span>{isSubmitting ? "Opening..." : "Open Theme Editor"}</span>
              <span>→</span>
            </button>

            {/* Subtle Navigation controls */}
            {/* <div className="flex items-center justify-between w-full mt-3 px-1">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                ← Back to Welcome
              </button>

              <button
                type="button"
                onClick={() => {
                  const formData = new FormData();
                  formData.append("intent", "complete");
                  submit(formData, { method: "post" });
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Skip to Dashboard →
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}
