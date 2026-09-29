import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLoaderData, useSearchParams, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Loader ───────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period") || "7"; // "7" | "30" | "all"

  const now = new Date();

  // 1. Calculate time boundaries for KPI metrics and table breakdown
  let periodStart = null;
  let prevPeriodStart = null;
  let prevPeriodEnd = null;

  if (periodParam === "7") {
    periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    prevPeriodEnd = periodStart;
  } else if (periodParam === "30") {
    periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevPeriodEnd = periodStart;
  }
  // If periodParam === "all", periodStart is null (no date filter for current events)

  // 2. Fires over time is ALWAYS strictly the last 7 days (fixed)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 3. Parallel live database queries
  const [
    currentEvents,
    prevEvents,
    last7DaysEvents,
    activeEffects,
  ] = await Promise.all([
    // Current period events
    prisma.confettiFireEvent.findMany({
      where: {
        shop,
        ...(periodStart ? { firedAt: { gte: periodStart } } : {}),
      },
      select: {
        id: true,
        effectId: true,
        completed: true,
        firedAt: true,
      },
      orderBy: { firedAt: "asc" },
    }),

    // Previous period events (for delta comparison, only for 7 and 30 days)
    prevPeriodStart && prevPeriodEnd
      ? prisma.confettiFireEvent.findMany({
          where: {
            shop,
            firedAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
          },
          select: { id: true, completed: true },
        })
      : Promise.resolve([]),

    // Always fetch last 7 days of fire events for the bar chart
    prisma.confettiFireEvent.findMany({
      where: {
        shop,
        firedAt: { gte: sevenDaysAgo },
      },
      select: { firedAt: true },
    }),

    // Currently active effects
    prisma.confettiEffect.findMany({
      where: { shop, status: "active" },
      select: {
        id: true,
        name: true,
        triggerEvent: true,
        shape: true,
        colors: true,
        mode: true,
      },
    }),
  ]);

  // ── KPI: Total fires & delta ────────────────────────────────────────────────
  const totalFires = currentEvents.length;
  const prevTotalFires = prevEvents.length;
  let firesDelta = null;
  if (prevPeriodStart && prevTotalFires > 0) {
    firesDelta = Math.round(((totalFires - prevTotalFires) / prevTotalFires) * 100);
  }

  // ── KPI: Completion rate & delta ────────────────────────────────────────────
  const completedCount = currentEvents.filter((e) => e.completed).length;
  const completionRate =
    totalFires === 0 ? 0 : Math.round((completedCount / totalFires) * 100);

  const prevCompleted = prevEvents.filter((e) => e.completed).length;
  const prevCompletionRate =
    prevEvents.length === 0
      ? 0
      : Math.round((prevCompleted / prevEvents.length) * 100);

  let completionDelta = null;
  if (prevPeriodStart && totalFires > 0 && prevEvents.length > 0) {
    completionDelta = completionRate - prevCompletionRate;
  }

  // ── Fires per day (Always exactly the last 7 calendar days) ───────────────────
  const firesPerDay = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const count = last7DaysEvents.filter((e) => {
      const d = new Date(e.firedAt);
      return d >= dayStart && d <= dayEnd;
    }).length;

    firesPerDay.push({
      label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  // ── Per-effect breakdown (Live from DB) ───────────────────────────────────────
  const effectBreakdown = activeEffects.map((eff) => {
    const effEvents = currentEvents.filter((e) => e.effectId === eff.id);
    const effCompleted = effEvents.filter((e) => e.completed).length;

    // Subtitle and preview based on effect attributes
    let subtitle = "Custom confetti animation";
    let previewType = "confetti";

    if (eff.shape === "star") {
      subtitle = "Stars and sparkles";
      previewType = "stars";
    } else if (eff.shape === "heart") {
      subtitle = "A subtle heart burst";
      previewType = "hearts";
    } else if (eff.mode === "burst") {
      subtitle = "A burst of colorful confetti";
    } else if (eff.mode === "falling") {
      subtitle = "Gentle falling confetti";
    } else if (eff.mode === "firework") {
      subtitle = "Stunning fireworks display";
    } else if (eff.mode === "cannon") {
      subtitle = "Celebration cannons firing";
    } else if (eff.mode === "fountain") {
      subtitle = "Confetti fountain explosion";
    }

    return {
      id: eff.id,
      name: eff.name,
      subtitle,
      triggerEvent: eff.triggerEvent || "Page Loaded",
      shape: eff.shape || "circle",
      colors: Array.isArray(eff.colors) ? eff.colors : [],
      mode: eff.mode || "burst",
      previewType,
      totalFires: effEvents.length,
      completionRate:
        effEvents.length === 0
          ? 0
          : Math.round((effCompleted / effEvents.length) * 100),
    };
  });

  // Sort by total fires descending
  effectBreakdown.sort((a, b) => b.totalFires - a.totalFires);

  return {
    shop,
    periodParam,
    totalFires,
    firesDelta,
    completionRate,
    completionDelta,
    activeEffectsCount: activeEffects.length,
    firesPerDay,
    effectBreakdown,
  };
};

// ─── SVG Party Popper Badge for Card 1 ─────────────────────────────────────────
function PartyPopperBadge() {
  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 16,
        background: "#f5f3ff",
        border: "1px solid #ede9fe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.8 11.3 2 22l10.7-3.79" fill="#ddd6fe" fillOpacity="0.45" />
        <path d="M4 3h.01" />
        <path d="M22 8h.01" />
        <path d="M15 2h.01" />
        <path d="M22 20h.01" />
        <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 12" />
        <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
        <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.91 9 5.52 9 6.23V7" />
        <path
          d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
          fill="#c4b5fd"
          fillOpacity="0.45"
        />
      </svg>
    </div>
  );
}

// ─── SVG Donut Chart for Card 2 ───────────────────────────────────────────────
function DonutChart({ percentage = 0 }) {
  const r = 27;
  const circ = 2 * Math.PI * r; // ~169.65
  const clampedPct = Math.min(Math.max(Number(percentage) || 0, 0), 100);
  const strokeOffset = circ - (clampedPct / 100) * circ;

  return (
    <svg width="68" height="68" viewBox="0 0 74 74" style={{ overflow: "visible" }}>
      {/* Background track circle */}
      <circle
        cx="37"
        cy="37"
        r={r}
        fill="none"
        stroke="#ede9fe"
        strokeWidth="9"
      />
      {/* Purple progress circle starting at 12 o'clock (top) and sweeping clockwise */}
      {clampedPct > 0 && (
        <circle
          cx="37"
          cy="37"
          r={r}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeOffset}
          transform="rotate(-90 37 37)"
          style={{
            transition: "stroke-dashoffset 0.8s ease",
          }}
        />
      )}
    </svg>
  );
}

// ─── SVG Lightning Bolt Badge for Card 3 ──────────────────────────────────────
function LightningBadge() {
  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 16,
        background: "#faf5ff",
        border: "1px solid #f3e8ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9333ea"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon
          points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
          fill="#c084fc"
          fillOpacity="0.35"
        />
      </svg>
    </div>
  );
}

// ─── Style Preview Components ─────────────────────────────────────────────────
function StylePreviewCell({ type = "confetti", colors = [] }) {
  if (type === "stars") {
    return (
      <svg width="104" height="34" viewBox="0 0 104 34" fill="none">
        <path
          d="M22 17 Q22 21 18 21 Q22 21 22 25 Q22 21 26 21 Q22 21 22 17 Z"
          fill="#fbbf24"
        />
        <circle cx="28" cy="13" r="1.5" fill="#fde047" />
        <path
          d="M48 6 Q48 17 37 17 Q48 17 48 28 Q48 17 59 17 Q48 17 48 6 Z"
          fill="#f59e0b"
        />
        <circle cx="62" cy="11" r="1.8" fill="#fbbf24" />
        <path
          d="M80 10 Q80 18 72 18 Q80 18 80 26 Q80 18 88 18 Q80 18 80 10 Z"
          fill="#fbbf24"
        />
        <circle cx="86" cy="24" r="1.5" fill="#f59e0b" />
        <circle cx="40" cy="25" r="1.5" fill="#fbbf24" />
      </svg>
    );
  }

  if (type === "hearts") {
    return (
      <svg width="104" height="34" viewBox="0 0 104 34" fill="none">
        <path
          d="M18 19 C18 16.5 15.5 14.5 13 14.5 C10.5 14.5 9 16.5 9 18.5 C9 22.5 14 26 18 28.5 C22 26 27 22.5 27 18.5 C27 16.5 25.5 14.5 23 14.5 C20.5 14.5 18 16.5 18 19 Z"
          fill="#f472b6"
          transform="translate(4, -4) scale(0.85)"
        />
        <path
          d="M18 19 C18 16.5 15.5 14.5 13 14.5 C10.5 14.5 9 16.5 9 18.5 C9 22.5 14 26 18 28.5 C22 26 27 22.5 27 18.5 C27 16.5 25.5 14.5 23 14.5 C20.5 14.5 18 16.5 18 19 Z"
          fill="#c084fc"
          transform="translate(26, -6) scale(0.95)"
        />
        <path
          d="M18 19 C18 16.5 15.5 14.5 13 14.5 C10.5 14.5 9 16.5 9 18.5 C9 22.5 14 26 18 28.5 C22 26 27 22.5 27 18.5 C27 16.5 25.5 14.5 23 14.5 C20.5 14.5 18 16.5 18 19 Z"
          fill="#a855f7"
          transform="translate(48, -4) scale(0.9)"
        />
        <path
          d="M18 19 C18 16.5 15.5 14.5 13 14.5 C10.5 14.5 9 16.5 9 18.5 C9 22.5 14 26 18 28.5 C22 26 27 22.5 27 18.5 C27 16.5 25.5 14.5 23 14.5 C20.5 14.5 18 16.5 18 19 Z"
          fill="#93c5fd"
          transform="translate(70, -6) scale(0.75)"
        />
        <path
          d="M18 19 C18 16.5 15.5 14.5 13 14.5 C10.5 14.5 9 16.5 9 18.5 C9 22.5 14 26 18 28.5 C22 26 27 22.5 27 18.5 C27 16.5 25.5 14.5 23 14.5 C20.5 14.5 18 16.5 18 19 Z"
          fill="#f472b6"
          transform="translate(24, 7) scale(0.65)"
        />
      </svg>
    );
  }

  // Default: scattered colorful confetti dots
  const palette =
    colors && colors.length > 0
      ? colors
      : ["#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#3b82f6"];

  return (
    <svg width="104" height="34" viewBox="0 0 104 34" fill="none">
      <circle cx="8" cy="18" r="2.5" fill={palette[0 % palette.length]} />
      <circle cx="20" cy="10" r="3" fill={palette[1 % palette.length]} />
      <circle cx="26" cy="24" r="2" fill={palette[2 % palette.length]} />
      <circle cx="38" cy="14" r="3.2" fill={palette[3 % palette.length]} />
      <circle cx="48" cy="8" r="2.5" fill={palette[4 % palette.length]} />
      <circle cx="56" cy="22" r="3" fill={palette[5 % palette.length] || palette[0]} />
      <circle cx="68" cy="12" r="2.5" fill={palette[1 % palette.length]} />
      <circle cx="76" cy="25" r="3.5" fill={palette[2 % palette.length]} />
      <circle cx="88" cy="16" r="2" fill={palette[3 % palette.length]} />
      <circle cx="94" cy="22" r="2.5" fill={palette[4 % palette.length]} />
    </svg>
  );
}

// ─── Bar Chart Component (Always 7 Days) ───────────────────────────────────────
function FiresOverTimeChart({ data = [] }) {
  const highestCount = Math.max(...data.map((d) => d.count), 0);

  // Determine dynamic scale matching wireframe aesthetic
  let chartMax = 1500;
  let yTicks = [
    { label: "1.5K", val: 1500 },
    { label: "1K", val: 1000 },
    { label: "500", val: 500 },
    { label: "0", val: 0 },
  ];

  if (highestCount > 1500) {
    chartMax = Math.ceil(highestCount / 500) * 500;
    yTicks = [
      { label: `${(chartMax / 1000).toFixed(1)}K`, val: chartMax },
      { label: `${((chartMax * 0.67) / 1000).toFixed(1)}K`, val: Math.round(chartMax * 0.67) },
      { label: `${((chartMax * 0.33) / 1000).toFixed(1)}K`, val: Math.round(chartMax * 0.33) },
      { label: "0", val: 0 },
    ];
  } else if (highestCount > 0 && highestCount <= 10) {
    chartMax = 10;
    yTicks = [
      { label: "10", val: 10 },
      { label: "7", val: 7 },
      { label: "3", val: 3 },
      { label: "0", val: 0 },
    ];
  } else if (highestCount > 10 && highestCount <= 100) {
    chartMax = Math.ceil(highestCount / 20) * 20;
    yTicks = [
      { label: `${chartMax}`, val: chartMax },
      { label: `${Math.round(chartMax * 0.67)}`, val: Math.round(chartMax * 0.67) },
      { label: `${Math.round(chartMax * 0.33)}`, val: Math.round(chartMax * 0.33) },
      { label: "0", val: 0 },
    ];
  }

  return (
    <div style={{ position: "relative", width: "100%", height: 210, paddingTop: 10 }}>
      {/* Chart container with Y-axis and Grid */}
      <div style={{ display: "flex", height: 165, position: "relative" }}>
        {/* Y-axis Labels */}
        <div
          style={{
            width: 44,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: 2,
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          {yTicks.map((tick, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#94a3b8",
                lineHeight: 1,
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Gridlines & Bars Container */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          {/* Horizontal dashed grid lines */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              pointerEvents: "none",
            }}
          >
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                style={{
                  width: "100%",
                  borderBottom: "1px dashed #e2e8f0",
                  height: 0,
                }}
              />
            ))}
          </div>

          {/* Bars Row */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            {data.map((item, index) => {
              const isLast = index === data.length - 1;
              const hasCount = item.count > 0;
              const heightPct =
                chartMax === 0 ? 0 : Math.min(Math.round((item.count / chartMax) * 100), 100);

              const barBg = isLast
                ? "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)"
                : "linear-gradient(180deg, #d8b4fe 0%, #c4b5fd 100%)";

              return (
                <div
                  key={index}
                  className="bar-col"
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  {/* Floating tooltip on hover */}
                  <div
                    className="bar-tooltip"
                    style={{
                      position: "absolute",
                      bottom: `calc(${Math.max(heightPct, 4)}% + 10px)`,
                      background: "#0f172a",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      opacity: 0,
                      transform: "translateY(4px)",
                      transition: "opacity 0.2s ease, transform 0.2s ease",
                      zIndex: 20,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    {item.label}: {item.count.toLocaleString()} fire{item.count !== 1 ? "s" : ""}
                  </div>

                  {/* The Bar */}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 100,
                      height: hasCount ? `${Math.max(heightPct, 4)}%` : "3px",
                      background: hasCount ? barBg : "#e2e8f0",
                      borderRadius: "6px 6px 0 0",
                      opacity: hasCount ? 1 : 0.5,
                      transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis Date Labels */}
      <div
        style={{
          display: "flex",
          paddingLeft: 44,
          paddingRight: 8,
          marginTop: 12,
          gap: 16,
        }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 500,
              color: "#64748b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Analytics Page Component ───────────────────────────────────────────
export default function AnalyticsPage() {
  const {
    periodParam,
    totalFires,
    firesDelta,
    completionRate,
    completionDelta,
    activeEffectsCount,
    firesPerDay,
    effectBreakdown,
  } = useLoaderData();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";

  // The ONLY 3 options: 7 days, 30 days, all time
  const rangeOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "All time", value: "all" },
  ];

  const handleRangeChange = (val) => {
    const params = new URLSearchParams(searchParams);
    params.set("period", val);
    navigate(`/app/analytics?${params.toString()}`);
    setDropdownOpen(false);
  };

  // Filter table by search query
  const filteredEffects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return effectBreakdown;
    return effectBreakdown.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
        (e.triggerEvent && e.triggerEvent.toLowerCase().includes(q))
    );
  }, [effectBreakdown, search]);

  const currentOption =
    rangeOptions.find((r) => r.value === periodParam) || rangeOptions[0];

  const deltaComparisonText =
    periodParam === "7"
      ? "vs previous 7 days"
      : periodParam === "30"
      ? "vs previous 30 days"
      : "All time total";

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
      <style>{`
        .bar-col:hover .bar-tooltip {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .table-row {
          transition: background-color 0.15s ease;
        }
        .table-row:hover {
          background-color: #fafbfe !important;
        }
        .dropdown-item:hover {
          background-color: #f8fafc;
        }
        .kpi-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04) !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>

      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* ── Back Navigation: ← Effects ───────────────────────────── */}
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
            Effects
          </Link>
        </div>

        {/* ── Header Row: Title, Subtitle, Date Range Dropdown ─────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
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
              Analytics
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                marginTop: 6,
                fontWeight: 500,
                marginBottom: 0,
              }}
            >
              See how your confetti effects are performing. Track engagement and celebrate your success! 
            </p>
          </div>

          {/* Date Range Dropdown: 7 days, 30 days, all time */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              id="date-range-dropdown-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#0f172a",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                outline: "none",
              }}
            >
              {/* Purple Calendar Icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>

              <span>{currentOption.label}</span>

              {/* Chevron Down */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  minWidth: 160,
                  padding: "6px 0",
                  zIndex: 50,
                }}
              >
                {rangeOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className="dropdown-item"
                    onClick={() => handleRangeChange(opt.value)}
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: periodParam === opt.value ? 700 : 500,
                      color: periodParam === opt.value ? "#4f46e5" : "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{opt.label}</span>
                    {periodParam === opt.value && (
                      <span style={{ color: "#4f46e5", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3 KPI Cards Row ────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 20,
          }}
        >
          {/* Card 1: Total fires */}
          <div
            className="kpi-card"
            style={{
              background: "linear-gradient(135deg, #FDEEFA 0%, #F9F9FF 52%, #E9F3FD 100%)",
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: "24px 26px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#4f46e5",
                  marginBottom: 6,
                }}
              >
                Total fires
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {totalFires.toLocaleString()}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                {firesDelta !== null && firesDelta !== 0 ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: firesDelta > 0 ? "#dcfce7" : "#fee2e2",
                      color: firesDelta > 0 ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {firesDelta > 0 ? "↑" : "↓"} {Math.abs(firesDelta)}%
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#f1f5f9",
                      color: "#64748b",
                    }}
                  >
                    —
                  </span>
                )}
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  {deltaComparisonText}
                </span>
              </div>
            </div>

            {/* Right Party Popper Badge */}
            <div style={{ flexShrink: 0, marginLeft: 16 }}>
              <PartyPopperBadge />
            </div>
          </div>

          {/* Card 2: Completion rate */}
          <div
            className="kpi-card"
            style={{
              background: "linear-gradient(135deg, #FDEEFA 0%, #F9F9FF 52%, #E9F3FD 100%)",
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: "24px 26px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#4f46e5",
                  marginBottom: 6,
                }}
              >
                Completion rate
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {completionRate}%
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                {completionDelta !== null && completionDelta !== 0 ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: completionDelta > 0 ? "#dcfce7" : "#fee2e2",
                      color: completionDelta > 0 ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {completionDelta > 0 ? "↑" : "↓"} {Math.abs(completionDelta)}%
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#f1f5f9",
                      color: "#64748b",
                    }}
                  >
                    —
                  </span>
                )}
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  {deltaComparisonText}
                </span>
              </div>
            </div>

            {/* Right Donut Chart */}
            <div style={{ flexShrink: 0, marginLeft: 16 }}>
              <DonutChart percentage={completionRate} />
            </div>
          </div>

          {/* Card 3: Active effects */}
          <div
            className="kpi-card"
            style={{
              background: "linear-gradient(135deg, #FDEEFA 0%, #F9F9FF 52%, #E9F3FD 100%)",
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              padding: "24px 26px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#4f46e5",
                  marginBottom: 6,
                }}
              >
                Active effects
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {activeEffectsCount}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#f1f5f9",
                    color: "#64748b",
                  }}
                >
                  —
                </span>
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  No change
                </span>
              </div>
            </div>

            {/* Right Lightning Bolt Badge */}
            <div style={{ flexShrink: 0, marginLeft: 16 }}>
              <LightningBadge />
            </div>
          </div>
        </div>

        {/* ── Fires over time Card (Always last 7 days) ─────────────── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            padding: "24px 28px 20px",
            marginTop: 20,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Fires over time
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                fontWeight: 500,
                marginTop: 3,
                marginBottom: 0,
              }}
            >
              Total confetti fires triggered in the last 7 days.
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <FiresOverTimeChart data={firesPerDay} />
          </div>
        </div>

        {/* ── Active effects Table Card ────────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            padding: "24px 28px",
            marginTop: 20,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Top section: Title & Search bar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Active effects
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 500,
                  marginTop: 3,
                  marginBottom: 0,
                }}
              >
                Performance of your currently active confetti effects.
              </p>
            </div>

            {/* Search effects input */}
            <div style={{ position: "relative" }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                type="text"
                id="search-effects-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search effects..."
                style={{
                  paddingLeft: 34,
                  paddingRight: 14,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  outline: "none",
                  background: "#ffffff",
                  color: "#0f172a",
                  width: 220,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      width: "28%",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      width: "24%",
                    }}
                  >
                    Trigger Event
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      width: "16%",
                    }}
                  >
                    Total fires
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      width: "16%",
                    }}
                  >
                    Completion rate
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      paddingBottom: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      width: "16%",
                    }}
                  >
                    Style Preview
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEffects.length > 0 ? (
                  filteredEffects.map((eff) => (
                    <tr
                      key={eff.id}
                      className="table-row"
                      style={{
                        borderBottom: "1px solid #f8fafc",
                      }}
                    >
                      {/* Name & Subtitle */}
                      <td style={{ padding: "16px 12px 16px 0" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#0f172a",
                            fontSize: 13.5,
                          }}
                        >
                          {eff.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 3,
                            fontWeight: 400,
                          }}
                        >
                          {eff.subtitle}
                        </div>
                      </td>

                      {/* Trigger Event */}
                      <td
                        style={{
                          padding: "16px 12px 16px 0",
                          color: "#334155",
                          fontWeight: 500,
                        }}
                      >
                        {eff.triggerEvent}
                      </td>

                      {/* Total Fires */}
                      <td
                        style={{
                          padding: "16px 12px 16px 0",
                          color: "#0f172a",
                          fontWeight: 700,
                        }}
                      >
                        {eff.totalFires.toLocaleString()}
                      </td>

                      {/* Completion Rate */}
                      <td
                        style={{
                          padding: "16px 12px 16px 0",
                          color: "#0f172a",
                          fontWeight: 700,
                        }}
                      >
                        {eff.completionRate}%
                      </td>

                      {/* Style Preview */}
                      <td
                        style={{
                          padding: "16px 0",
                          textAlign: "center",
                        }}
                      >
                        <StylePreviewCell
                          type={eff.previewType}
                          colors={eff.colors}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "36px 0",
                        color: "#94a3b8",
                        fontSize: 13,
                      }}
                    >
                      {effectBreakdown.length === 0
                        ? "No active confetti effects found. Activate an effect from the Effects dashboard to track its analytics."
                        : "No active confetti effects found matching your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Showing N-M of Total footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid #f8fafc",
              fontSize: 12,
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            Showing {filteredEffects.length} of {effectBreakdown.length} active effect
            {effectBreakdown.length !== 1 ? "s" : ""}
          </div>
        </div>

      </div>
    </div>
  );
}
