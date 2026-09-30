import { useState, useEffect } from "react";
import { redirect, Form, useLoaderData, Link, useSearchParams, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import ConfettiLoadingScreen from "../components/ConfettiLoadingScreen";

// Server-side in-memory caches to prevent slow GraphQL calls on every action revalidation
const appUrlCache = new Map(); // shop -> { url: string, time: number }
const appEmbedCache = new Map(); // shop -> { enabled: boolean, time: number }

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

  // If onboarding is false, redirect to /app/onboarding
  if (!shopRecord.isOnboarded) {
    const searchParams = url.searchParams.toString();
    throw redirect(`/app/onboarding${searchParams ? `?${searchParams}` : ""}`);
  }

  let effects = await prisma.confettiEffect.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  // Resilient fallback if in-memory Prisma client DMMF has not refreshed preMade column
  if (effects.length > 0 && effects[0].preMade === undefined) {
    try {
      const rawRows = await prisma.$queryRawUnsafe(
        'SELECT id, "preMade" FROM "ConfettiEffect" WHERE shop = $1',
        session.shop
      );
      const preMadeMap = new Map((rawRows || []).map((r) => [r.id, Boolean(r.preMade)]));
      effects = effects.map((eff) => ({
        ...eff,
        preMade: preMadeMap.get(eff.id) ?? false,
      }));
    } catch (e) {
      console.error("Error querying preMade column:", e);
    }
  }

  // 1. Sync app_url only if not already synced in the last 10 minutes (or if URL changed)
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const fwdHost  = request.headers.get("x-forwarded-host")  || new URL(request.url).host;
  let appUrl = `${fwdProto}://${fwdHost}`;
  if (appUrl.startsWith("http://") && !appUrl.includes("localhost")) {
    appUrl = appUrl.replace("http://", "https://");
  }

  const cachedUrlEntry = appUrlCache.get(session.shop);
  const isUrlFresh =
    cachedUrlEntry &&
    Date.now() - cachedUrlEntry.time < 10 * 60 * 1000 &&
    cachedUrlEntry.url === appUrl;

  if (!isUrlFresh) {
    try {
      const { admin } = await authenticate.admin(request);
      const shopQuery = await admin.graphql(`
        query GetShopId {
          shop {
            id
          }
        }
      `);
      const shopJson = await shopQuery.json();
      const shopGid = shopJson?.data?.shop?.id;

      if (shopGid) {
        await admin.graphql(
          `mutation SetAppUrl($mf: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $mf) {
              metafields { id value }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              mf: [
                {
                  namespace: "confetti_flow",
                  key: "app_url",
                  value: appUrl,
                  type: "single_line_text_field",
                  ownerId: shopGid,
                },
              ],
            },
          }
        );
        appUrlCache.set(session.shop, { url: appUrl, time: Date.now() });
        console.log("[ConfettiFlow] Synced app_url metafield:", appUrl);
      }
    } catch (e) {
      console.warn("[ConfettiFlow] Could not sync app_url metafield:", e.message);
    }
  }

  // 2. Check if App Embed is enabled in the active theme (cached for 60s)
  let isAppEmbedEnabled = true;
  const cachedEmbed = appEmbedCache.get(session.shop);
  if (cachedEmbed && Date.now() - cachedEmbed.time < 60 * 1000) {
    isAppEmbedEnabled = cachedEmbed.enabled;
  } else {
    try {
      const { admin } = await authenticate.admin(request);
      const themeRes = await admin.graphql(`
        query CheckAppEmbed {
          themes(first: 5, roles: [MAIN]) {
            nodes {
              id
              name
              role
              files(first: 5, filenames: ["config/settings_data.json"]) {
                nodes {
                  filename
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }
        }
      `);
      const themeJson = await themeRes.json();
      const mainTheme = themeJson?.data?.themes?.nodes?.[0];
      if (mainTheme) {
        const content = mainTheme.files?.nodes?.[0]?.body?.content;
        if (content) {
          const cleaned = content.replace(/\/\*[\s\S]*?\*\//g, "").trim();
          const parsed = JSON.parse(cleaned);
          const blocks = parsed?.current?.blocks || {};

          let found = false;
          let enabled = false;

          for (const [id, block] of Object.entries(blocks)) {
            if (
              block &&
              typeof block.type === "string" &&
              (block.type.includes("confetti-embed") || block.type.includes("confettiflow"))
            ) {
              found = true;
              if (!block.disabled) {
                enabled = true;
              }
              break;
            }
          }

          isAppEmbedEnabled = found && enabled;
        }
      }
      appEmbedCache.set(session.shop, { enabled: isAppEmbedEnabled, time: Date.now() });
    } catch (e) {
      console.warn("[ConfettiFlow] Could not check app embed status:", e.message);
    }
  }

  return {
    shop: session.shop,
    isOnboarded: shopRecord.isOnboarded,
    effects,
    isAppEmbedEnabled,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset_onboarding") {
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { isOnboarded: false },
    });

    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    return redirect(`/app/onboarding${searchParams ? `?${searchParams}` : ""}`);
  }

  if (intent === "toggle_status") {
    const id = (formData.get("id") || "").toString();
    const currentStatus = (formData.get("currentStatus") || "").toString();
    const newStatus = currentStatus === "active" ? "draft" : "active";

    await prisma.confettiEffect.updateMany({
      where: { id, shop: session.shop },
      data: { status: newStatus },
    });
    return { ok: true };
  }

  if (intent === "delete_effect") {
    const id = (formData.get("id") || "").toString();
    await prisma.confettiEffect.deleteMany({
      where: { id, shop: session.shop },
    });
    return { ok: true };
  }

  return null;
};

// SVG 4-Point Sparkle Star
function SparkleStar({ color = "#fbbf24", size = 18, className = "" }) {
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

// Visual Preview: Colorful Confetti Sprinkles Burst
function ConfettiPreview() {
  return (
    <div className="flex items-center justify-center w-36 h-10 relative">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] absolute top-2 left-3"></span>
      <span className="w-2.5 h-1 rounded bg-[#38bdf8] transform -rotate-45 absolute top-1 left-8"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] absolute top-5 left-6"></span>
      <span className="w-2 h-1 rounded bg-[#fbbf24] transform rotate-30 absolute top-2 left-14"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] absolute top-6 left-12"></span>
      <span className="w-2.5 h-1 rounded bg-[#f97316] transform -rotate-15 absolute top-3 left-20"></span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] absolute top-6 left-24"></span>
      <span className="w-2 h-1 rounded bg-[#38bdf8] transform rotate-45 absolute top-1 left-28"></span>
    </div>
  );
}

// Visual Preview: Pastel Hearts
function HeartsPreview() {
  return (
    <div className="flex items-center space-x-2 w-36 h-10 justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#f472b6" className="transform -rotate-12">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#c084fc">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#a78bfa" className="transform rotate-6">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#7dd3fc" className="transform -rotate-6">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>
  );
}

// Visual Preview: Gold Sparkle Stars
function StarsPreview() {
  return (
    <div className="flex items-center space-x-2 w-36 h-10 justify-center">
      <SparkleStar color="#fbbf24" size={16} />
      <SparkleStar color="#f59e0b" size={24} />
      <SparkleStar color="#fbbf24" size={14} />
      <SparkleStar color="#f59e0b" size={20} />
    </div>
  );
}

// Visual Preview: Dynamic Confetti Dots based on Shape and Colors
function DynamicPreview({ shape = "circle", colors = [] }) {
  const palette = colors && colors.length > 0 ? colors : ["#e11d48", "#f472b6", "#fbbf24", "#10b981", "#3b82f6"];
  return (
    <div className="flex items-center space-x-1.5 w-36 h-10 justify-center">
      {palette.slice(0, 5).map((col, idx) => (
        <span
          key={idx}
          className="inline-block transition-transform hover:scale-125 shadow-xs"
          style={{
            width: shape === "circle" ? "9px" : "11px",
            height: shape === "circle" ? "9px" : "11px",
            backgroundColor: col,
            borderRadius: shape === "circle" ? "50%" : shape === "triangle" ? "2px" : "3px",
            transform: `rotate(${idx * 25 - 45}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function AppIndex() {
  const { shop, effects: dbEffects = [], isAppEmbedEnabled = true } = useLoaderData();
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const cleanParams = new URLSearchParams(searchParams);
  cleanParams.delete("id");
  cleanParams.delete("effectId");
  const queryStr = cleanParams.toString() ? `?${cleanParams.toString()}` : "";

  // Splash loader for initial page entry
  const [initialLoading, setInitialLoading] = useState(() => {
    if (typeof window !== "undefined" && window.__hasClientNavigated) {
      return false;
    }
    return true;
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!activeMenuId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown="action-menu"]')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  // Optimistic status state for instant UI toggle response (0ms)
  const [optimisticStatusMap, setOptimisticStatusMap] = useState({});

  // When dbEffects updates from server revalidation, clean up matching keys
  useEffect(() => {
    setOptimisticStatusMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const eff of dbEffects) {
        if (eff.id in next && (eff.status === "active") === next[eff.id]) {
          delete next[eff.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [dbEffects]);

  // Sample fallback template effects if user has not created any yet
  const sampleEffects = [  ];

  const effects = dbEffects.length > 0
    ? dbEffects.map((eff) => {
        const isLocallyOverridden = eff.id in optimisticStatusMap;
        const active = isLocallyOverridden
          ? optimisticStatusMap[eff.id]
          : eff.status === "active";

        return {
          id: eff.id,
          name: eff.name,
          subtitle: `${eff.mode} mode • ${eff.shape} • ${eff.duration}s`,
          triggerEvent: eff.triggerEvent,
          preview: <DynamicPreview shape={eff.shape} colors={eff.colors} />,
          active,
          isSample: false,
          preMade: Boolean(eff.preMade),
        };
      })
    : sampleEffects;

  // Toggle active status
  const toggleStatus = (eff) => {
    if (eff.isSample) {
      alert("This is a template preview. Click '+ New effect' to create your own live effect!");
      return;
    }

    const nextActive = !eff.active;

    // 1. Instant optimistic UI update (0ms!)
    setOptimisticStatusMap((prev) => ({
      ...prev,
      [eff.id]: nextActive,
    }));

    // 2. Submit to server in background
    fetcher.submit(
      {
        intent: "toggle_status",
        id: eff.id,
        currentStatus: eff.active ? "active" : "draft",
      },
      { method: "post" }
    );
  };

  const deleteEffect = (id) => {
    if (window.confirm("Are you sure you want to delete this confetti effect?")) {
      setActiveMenuId(null);
      fetcher.submit(
        {
          intent: "delete_effect",
          id,
        },
        { method: "post" }
      );
    }
  };

  // Filtered effects
  const filteredEffects = effects.filter(
    (eff) =>
      eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eff.triggerEvent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination state (Max 10 per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalEffects = filteredEffects.length;
  const totalPages = Math.max(1, Math.ceil(totalEffects / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalEffects);
  const paginatedEffects = filteredEffects.slice(startIndex, endIndex);

  // Keep currentPage bounded if items are deleted or filtered
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (initialLoading) {
    return <ConfettiLoadingScreen onComplete={() => setInitialLoading(false)} />;
  }

  return (
    <div
      className="min-h-screen w-full bg-[#f1f1f1] p-4 sm:p-6 md:p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* 1. TOP HEADER                                             */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Overview of your celebration effects
            </p>
          </div>

          {/* Analytics Button → navigates to /app/analytics */}
          <Link
            to={`/app/analytics${queryStr}`}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-2 flex items-center gap-2 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Analytics</span>
            <span className="text-slate-400 font-bold text-xs ml-0.5">›</span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* STOREFRONT APP EMBED WARNING (ONLY SHOWN WHEN OFF)        */}
        {/* ========================================================= */}
        {!isAppEmbedEnabled && (
          <div className="bg-amber-50/95 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-all animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300/70 flex items-center justify-center text-amber-700 shrink-0 text-xl shadow-2xs">
                ⚠️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    App Embed is turned OFF in your active theme
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300/70">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Confetti celebrations won't trigger on your storefront until the{" "}
                  <strong>ConfettiFlow Celebrations</strong> App Embed is enabled in your Shopify Theme Editor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <a
                href={`https://${shop}/admin/themes/current/editor?context=apps`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#4d319e] hover:bg-[#3f2485] active:scale-[0.98] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span>Enable in Theme Editor</span>
                <span className="text-xs font-bold">↗</span>
              </a>
              {/* <button
                type="button"
                onClick={() => window.location.reload()}
                title="Refresh and re-check theme status"
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span>↻</span>
                <span>Re-check</span>
              </button> */}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. HERO BANNER ("CREATE MAGIC")                           */}
        {/* ========================================================= */}
        <div
          className="relative border border-[#ece4fc] rounded-[24px] p-6 sm:p-7 md:p-8 shadow-sm overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg, #fff0feff 0%, #F9F9FF 50%, #EDF5FE 100%)",
            boxShadow:
              "0 4px 20px -2px rgba(109, 40, 217, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
          }}
           >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left Content Column */}
            <div className="shrink-0 max-w-[420px]">
              <span className="text-[11px] font-bold text-[#6d28d9] tracking-[0.14em] uppercase block mb-1">
                CREATE MAGIC
              </span>
              <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#0f172a] tracking-tight leading-[1.18]">
                Add celebration to<br className="hidden sm:inline" />{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #d946ef 0%, #a855f7 32%, #4f46e5 68%, #38bdf8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  your store events
                </span>
              </h2>
              <p className="text-[13px] sm:text-[13.5px] text-slate-500 font-normal mt-2.5 leading-relaxed max-w-[390px]">
                Create a new confetti effect or choose from our pre-made library to get started.
              </p>
            </div>

            {/* Middle: Sparkle Stars Trio (between text and buttons) */}
            <div className="hidden lg:flex flex-col justify-between h-24 relative w-12 shrink-0 pointer-events-none select-none my-auto">
              <SparkleStar color="#a855f7" size={19} className="absolute -top-1 left-0" />
              <SparkleStar color="#2dd4bf" size={18} className="absolute top-7 left-5" />
              <SparkleStar color="#fbbf24" size={17} className="absolute bottom-0 left-1" />
            </div>

            {/* Right Section: Action Buttons + Floating Stars */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-3.5 shrink-0 relative">
              {/* + New effect Button */}
              <Link
                to={`/app/newEffect${queryStr}`}
                className="bg-[#382793] hover:bg-[#2f1f80] active:scale-[0.98] text-white font-medium text-[13.5px] px-5 py-2.5 rounded-[14px] shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-2 shrink-0 select-none"
                style={{
                  boxShadow: "0 4px 14px rgba(56, 39, 147, 0.25)",
                }}
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>New effect</span>
              </Link>

              {/* Choose from pre-made library Button with Floating Stars (No Icon) */}
              <div className="relative shrink-0">
                {/* Gold star floating above the button */}
                <SparkleStar
                  color="#fbbf24"
                  size={18}
                  className="absolute -top-4 -right-1 pointer-events-none select-none"
                />

                {/* Purple star floating below the button */}
                <SparkleStar
                  color="#a855f7"
                  size={16}
                  className="absolute -bottom-4 right-1 pointer-events-none select-none"
                />

                <Link
                  to={`/app/premade${queryStr}`}
                  className="bg-white hover:bg-[#faf8fe] active:scale-[0.98] border-[1.5px] border-[#cbb8fc] hover:border-[#b89efc] text-[#382793] font-medium text-[13.5px] px-4 sm:px-5 py-2.5 rounded-[14px] transition-all duration-150 cursor-pointer flex items-center justify-center select-none"
                  style={{ textDecoration: "none" }}
                >
                  <span>Choose from pre-made library</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. "YOUR EFFECTS" TABLE CARD                              */}
        {/* ========================================================= */}
        <div
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm"
          style={{
            boxShadow:
              "0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Card Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Your effects
            </h3>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search effects..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300 transition-all"
              />
            </div>
          </div>

          {/* Effects Table */}
          <div className="overflow-x-auto sm:overflow-visible min-h-[140px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3.5 font-semibold">Name</th>
                  <th className="pb-3.5 font-semibold">Trigger Event</th>
                  <th className="pb-3.5 font-semibold text-center">
                    Style Preview
                  </th>
                  <th className="pb-3.5 font-semibold">Status</th>
                  <th className="pb-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEffects.length > 0 ? (
                  paginatedEffects.map((eff, index) => (
                    <tr
                      key={eff.id}
                      className={`hover:bg-slate-50/60 transition-colors group ${
                        activeMenuId === eff.id ? "relative z-30" : ""
                      }`}
                    >
                      {/* Name Column */}
                      <td className="py-4 sm:py-5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm sm:text-[15px]">
                            {eff.name}
                          </span>
                          {eff.preMade && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 shrink-0">
                              Premade
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {eff.subtitle}
                        </div>
                      </td>

                      {/* Trigger Event Column */}
                      <td className="py-4 sm:py-5 pr-4 text-sm font-semibold text-slate-700">
                        {eff.triggerEvent}
                      </td>

                      {/* Style Preview Column */}
                      <td className="py-4 sm:py-5 text-center">
                        <div className="inline-flex items-center justify-center">
                          {eff.preview}
                        </div>
                      </td>

                      {/* Status Column (Toggle + Badge) */}
                      <td className="py-4 sm:py-5 pr-4">
                        <div className="flex items-center space-x-3">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => toggleStatus(eff)}
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer shadow-inner flex items-center ${
                              eff.active
                                ? "bg-[#10b981] justify-end"
                                : "bg-slate-300 justify-start"
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white shadow-sm block transition-transform"></span>
                          </button>

                          {/* Status Badge */}
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              eff.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {eff.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td
                        className={`py-4 sm:py-5 text-right ${
                          activeMenuId === eff.id ? "relative z-40" : ""
                        }`}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {/* More actions dropdown (•••) */}
                          <div
                            className={`relative inline-block text-left ${
                              activeMenuId === eff.id ? "z-50" : ""
                            }`}
                            data-dropdown="action-menu"
                          >
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === eff.id ? null : eff.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg leading-none cursor-pointer tracking-widest inline-block"
                              title="More actions"
                            >
                              •••
                            </button>

                            {activeMenuId === eff.id && (
                              <div
                                className={`absolute right-0 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-semibold ${
                                  index === filteredEffects.length - 1 && filteredEffects.length > 1
                                    ? "bottom-full mb-1"
                                    : "top-full mt-1"
                                }`}
                              >
                                {eff.preMade ? (
                                  <div
                                    // className="w-full text-left px-3.5 py-2 text-slate-400 flex items-center gap-2 cursor-not-allowed select-none bg-slate-50/70"
                                    // title="Premade templates cannot be edited"
                                  >
                                      {/* <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="text-slate-400 shrink-0"
                                      >
                                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <span className="italic text-[11px] text-slate-400">Premade (Locked)</span> */}
                                  </div>
                                ) : (
                                  <Link
                                    to={
                                      eff.isSample
                                        ? `/app/newEffect${queryStr}`
                                        : `/app/newEffect?id=${eff.id}${queryStr ? `&${queryStr.slice(1)}` : ""}`
                                    }
                                    className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-purple-50 hover:text-[#4d319e] flex items-center gap-2 cursor-pointer transition-colors"
                                    style={{ textDecoration: "none" }}
                                    onClick={() => setActiveMenuId(null)}
                                  >
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                      <path d="m15 5 4 4" />
                                    </svg>
                                    <span>Edit</span>
                                  </Link>
                                )}

                                {!eff.isSample ? (
                                  <button
                                    type="button"
                                    onClick={() => deleteEffect(eff.id)}
                                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <span>🗑</span>
                                    <span>Delete</span>
                                  </button>
                                ) : (
                                  <div className="px-3.5 py-2 text-slate-400 font-normal border-t border-slate-100">
                                    Default template
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-400 text-sm"
                    >
                      No effects match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-3">
              <span>
                {totalEffects === 0
                  ? "No effects yet"
                  : searchQuery.trim()
                  ? `Showing ${startIndex + 1}–${endIndex} of ${totalEffects} effect${totalEffects === 1 ? "" : "s"}`
                  : totalEffects === 1
                  ? "Showing 1 of 1 effect"
                  : `Showing ${startIndex + 1}–${endIndex} of ${totalEffects} effects`}
              </span>

              {/* Arrow navigation buttons directly on the right side of the showing text */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
                    currentPage <= 1
                      ? "bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed select-none"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-xs active:scale-95"
                  }`}
                  title="Previous page"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
                    currentPage >= totalPages
                      ? "bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed select-none"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-xs active:scale-95"
                  }`}
                  title="Next page"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
            <span>
              Any issues?{" "}
              <Link
                to={`/app/contact${queryStr}`}
                className="text-[#6366f1] hover:underline font-semibold"
              >
                Contact us.
              </Link>
            </span>
          </div>
        </div>

        {/* Development & Testing Reset Control */}
        <div className="pt-2 flex justify-end">
          <Form method="post">
            <input type="hidden" name="intent" value="reset_onboarding" />
            {/* <button
              type="submit"
              className="text-xs text-slate-400 hover:text-slate-600 font-medium underline transition-colors cursor-pointer"
            >
              Reset to Onboarding (Dev tool)
            </button> */}
          </Form>
        </div>
      </div>
    </div>
  );
}
