import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useSubmit, useNavigation, redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getStorefrontThemeColors } from "../services/theme.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.searchParams.get("effectId");

  let effect = null;
  if (id) {
    effect = await prisma.confettiEffect.findFirst({
      where: { id, shop: session.shop },
    });
  }

  // Fetch active storefront theme brand colors
  const themeBrand = await getStorefrontThemeColors({
    shop: session.shop,
    accessToken: session.accessToken,
  });

  return { shop: session.shop, effect, themeBrand };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const effectId = formData.get("effectId")?.toString() || formData.get("id")?.toString();
  const name = formData.get("name")?.toString() || "Sale Celebration";
  const status = "active";
  const triggerEvent = formData.get("triggerEvent")?.toString() || "Order created";
  const intensity = parseInt(formData.get("intensity")?.toString() || "2", 10);
  const shape = formData.get("shape")?.toString() || "tag,star";
  const mode = formData.get("mode")?.toString() || "Cannon";
  const useBrandColor = formData.get("useBrandColor") === "true";

  let triggerConditions: Record<string, any> = {};
  try {
    triggerConditions = JSON.parse(
      formData.get("triggerConditions")?.toString() || "{}"
    );
  } catch (e) {
    triggerConditions = { appliesTo: "All discount codes" };
  }

  let colors: string[] = [];
  try {
    colors = JSON.parse(formData.get("colors")?.toString() || "[]");
  } catch (e) {
    colors = ["#ec4899", "#ef4444", "#f43f5e", "#d946ef", "#fda4af"];
  }

  let targetEffectId = effectId;

  if (effectId) {
    await prisma.confettiEffect.updateMany({
      where: { id: effectId, shop: session.shop },
      data: {
        name,
        status,
        triggerEvent,
        triggerConditions,
        shape,
        useBrandColor,
        colors,
        mode,
        intensity,
      },
    });
  } else {
    const created = await prisma.confettiEffect.create({
      data: {
        shop: session.shop,
        name,
        status,
        triggerEvent,
        triggerConditions,
        shape,
        useBrandColor,
        colors,
        mode,
        position: "Full screen",
        duration: 4,
        intensity,
        soundEnabled: false,
        soundType: "Fairy magic sparkle",
      },
    });
    targetEffectId = created.id;
  }

  // Ensure preMade is true in the database directly
  if (targetEffectId) {
    try {
      await (prisma as any).$executeRawUnsafe(
        'UPDATE "ConfettiEffect" SET "preMade" = true WHERE id = $1',
        targetEffectId
      );
    } catch (sqlErr) {
      console.error("Failed to update preMade status via SQL:", sqlErr);
    }
  }

  const url = new URL(request.url);
  url.searchParams.delete("id");
  url.searchParams.delete("effectId");
  url.searchParams.delete("template");
  const cleanParams = url.searchParams.toString();
  return redirect(`/app${cleanParams ? `?${cleanParams}` : ""}`);
};

export interface TemplateConfig {
  id: string;
  title: string;
  name: string;
  icon: string;
  subtitle: string;
  primaryColor: string;
  shapes: string[]; // e.g. ["snowflake", "star"]
  colors: string[];
  mode: "Falling" | "Cannon" | "Fountain" | "Fireworks" | "Burst";
  triggerEvent: string;
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  // 1. Christmas: Red & green palette, snowflake & star shapes, gentle falling motion
  christmas: {
    id: "christmas",
    title: "Christmas",
    name: "Christmas Celebration",
    icon: "🎄",
    subtitle:
      "Triggers during your Christmas sale window. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#15803d",
    shapes: ["snowflake", "star"],
    colors: ["#dc2626", "#16a34a", "#ffffff", "#eab308", "#15803d", "#f87171"],
    mode: "Falling",
    triggerEvent: "Order created",
  },
  // 2. Black Friday: Black, gold & white, sharp square/rectangle pieces, quick cannon motion
  "black-friday": {
    id: "black-friday",
    title: "Black Friday",
    name: "Black Friday Madness",
    icon: "🖤",
    subtitle:
      "Triggers when a Black Friday discount is applied. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#0f172a",
    shapes: ["rectangle"],
    colors: ["#0f172a", "#fbbf24", "#ffffff", "#1e293b", "#f59e0b", "#475569"],
    mode: "Cannon",
    triggerEvent: "Order created",
  },
  // 3. Diwali: Gold, deep orange & maroon, circle & star shapes in a fountain motion
  diwali: {
    id: "diwali",
    title: "Diwali",
    name: "Diwali Sparkle",
    icon: "🪔",
    subtitle:
      "Triggers during your Diwali collection sale. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#f59e0b",
    shapes: ["circle", "star"],
    colors: ["#fbbf24", "#ea580c", "#881337", "#f59e0b", "#991b1b", "#fed7aa"],
    mode: "Fountain",
    triggerEvent: "Order created",
  },
  // 4. New Year: Gold, silver & black, star & circle shapes in a fireworks pattern
  "new-year": {
    id: "new-year",
    title: "New Year",
    name: "New Year Countdown",
    icon: "🎆",
    subtitle:
      "Triggers on orders placed on New Year's. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#6366f1",
    shapes: ["star", "circle"],
    colors: ["#fbbf24", "#e2e8f0", "#0f172a", "#94a3b8", "#fef08a", "#cbd5e1"],
    mode: "Fireworks",
    triggerEvent: "Order created",
  },
  // 5. Sale: Hot pink & red (or brand colors), tag & star shapes, fired in cannon motion
  sale: {
    id: "sale",
    title: "Sale",
    name: "Sale Celebration",
    icon: "🏷",
    subtitle:
      "Fires whenever any discount code is used. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#ec4899",
    shapes: ["tag", "star"],
    colors: ["#ec4899", "#ef4444", "#f43f5e", "#d946ef", "#fda4af"],
    mode: "Cannon",
    triggerEvent: "Order created",
  },
  // 6. Anniversary: Soft pastel pink, gold & cream, heart & circle shapes in a gentle burst
  anniversary: {
    id: "anniversary",
    title: "Anniversary",
    name: "Store Anniversary",
    icon: "🎉",
    subtitle:
      "Triggers on a customer's store anniversary. This is a light edit, for full control build a custom effect instead.",
    primaryColor: "#f472b6",
    shapes: ["heart", "circle"],
    colors: ["#f472b6", "#fbbf24", "#fef3c7", "#fbcfe8", "#fde047"],
    mode: "Burst",
    triggerEvent: "Customer created",
  },
};

function ButtonSpinner({ className = "w-4 h-4 text-current" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-95"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const PRESET_MOCK_CONTENT: Record<
  string,
  {
    tag: string;
    title: string;
    subtitle: string;
    badge: string;
    products: Array<{ title: string; price: string; icon: string }>;
  }
> = {
  christmas: {
    badge: "🎄 Holiday Special",
    title: "Christmas Sale is Live!",
    subtitle: "Celebrate with 25% off holiday gifts & cozy winter essentials",
    tag: "XMAS25 APPLIED AT CHECKOUT",
    products: [
      { title: "Cozy Knit Sweater", price: "$54", icon: "🧶" },
      { title: "Holiday Boots", price: "$98", icon: "👢" },
      { title: "Scented Candle", price: "$28", icon: "🕯️" },
      { title: "Warm Wool Scarf", price: "$36", icon: "🧣" },
    ],
  },
  "black-friday": {
    badge: "🖤 Black Friday Deal",
    title: "Black Friday Doorbusters",
    subtitle: "Biggest savings of the year — up to 60% off sitewide today",
    tag: "DOORBUSTER VIP UNLOCKED",
    products: [
      { title: "Stealth Hoodie", price: "$68", icon: "🧥" },
      { title: "Leather Sneakers", price: "$120", icon: "👟" },
      { title: "Tech Backpack", price: "$85", icon: "🎒" },
      { title: "Matte Watch", price: "$145", icon: "⌚" },
    ],
  },
  diwali: {
    badge: "🪔 Festival of Lights",
    title: "Diwali Festive Dhamaka",
    subtitle: "Brighten your festive celebrations with exclusive golden discounts",
    tag: "FESTIVE JOY ACTIVATED",
    products: [
      { title: "Festive Silk Kurta", price: "$75", icon: "🥻" },
      { title: "Brass Diya Set", price: "$42", icon: "🪔" },
      { title: "Handcrafted Jutti", price: "$58", icon: "👞" },
      { title: "Royal Gift Hamper", price: "$89", icon: "🎁" },
    ],
  },
  "new-year": {
    badge: "🎆 New Year 2026",
    title: "New Year Celebration",
    subtitle: "Start your new year fresh with celebratory bonus perks",
    tag: "WELCOME 2026 DISCOUNT",
    products: [
      { title: "2026 Goal Planner", price: "$32", icon: "📔" },
      { title: "Studio Wireless Buds", price: "$110", icon: "🎧" },
      { title: "Performance Runner", price: "$95", icon: "👟" },
      { title: "Travel Tumbler", price: "$38", icon: "☕" },
    ],
  },
  sale: {
    badge: "🏷️ Flash Sale Exclusive",
    title: "Special Sale Celebration",
    subtitle: "Your special promotional discount was automatically applied",
    tag: "20% OFF ORDER REWARD",
    products: [
      { title: "Heavyweight Tee", price: "$34", icon: "👕" },
      { title: "Canvas Tote Bag", price: "$46", icon: "👜" },
      { title: "Corduroy Cap", price: "$29", icon: "🧢" },
      { title: "Leather Belt", price: "$39", icon: "👔" },
    ],
  },
  anniversary: {
    badge: "🎉 Store Anniversary",
    title: "Happy Store Anniversary!",
    subtitle: "Celebrating another milestone year together with loyalty rewards",
    tag: "ANNIVERSARY VIP GIFT",
    products: [
      { title: "Floral Celebration Tote", price: "$44", icon: "🛍️" },
      { title: "Rose Gold Pendant", price: "$88", icon: "✨" },
      { title: "Luxury Plush Bathrobe", price: "$68", icon: "👘" },
      { title: "Artisan Perfume Oil", price: "$52", icon: "🌸" },
    ],
  },
};

const INTENSITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Extreme",
};

export default function EditPremadeEffectPage() {
  const loaderData = useLoaderData<typeof loader>();
  const effect = loaderData?.effect;
  const themeBrand = loaderData?.themeBrand;
  const isEditing = Boolean(effect?.id);

  // Dynamic theme colors detected from store
  const detectedBrandColors =
    themeBrand?.brandColors && themeBrand.brandColors.length > 0
      ? themeBrand.brandColors
      : ["#008060", "#004c3f", "#479ccf", "#0099e6", "#002aff"];
  const brandPrimaryColor = themeBrand?.primaryColor || detectedBrandColors[0];
  const themeName = themeBrand?.themeName || "Store theme";

  const [searchParams] = useSearchParams();
  const templateKey = searchParams.get("template") || "sale";
  const template = TEMPLATES[templateKey] || TEMPLATES.sale;

  const cleanParams = new URLSearchParams(searchParams);
  cleanParams.delete("id");
  cleanParams.delete("effectId");
  cleanParams.delete("template");
  const queryStr = cleanParams.toString() ? `?${cleanParams.toString()}` : "";

  // Trigger conditions from existing effect if editing
  const tc =
    typeof effect?.triggerConditions === "object" && effect?.triggerConditions !== null
      ? (effect.triggerConditions as Record<string, any>)
      : {};

  // Form State
  const [useBrandColors, setUseBrandColors] = useState(
    effect?.useBrandColor !== undefined ? effect.useBrandColor : false
  );
  const [intensity, setIntensity] = useState(
    typeof effect?.intensity === "number" ? effect.intensity : 2
  );
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Trigger Event & Conditions matching newEffect page
  const [triggerEvent, setTriggerEvent] = useState<string>(
    effect?.triggerEvent || template.triggerEvent || "Order created"
  );

  const [productTagOp, setProductTagOp] = useState(tc.productTagOp || "Contains");
  const [productTagVal, setProductTagVal] = useState(tc.productTagVal || "");

  const [discountOp, setDiscountOp] = useState(tc.discountOp || "Contains");
  const [discountVal, setDiscountVal] = useState(
    tc.discountVal !== undefined
      ? tc.discountVal
      : templateKey === "black-friday"
      ? "BLACKFRIDAY"
      : ""
  );
  const [orderValueMin, setOrderValueMin] = useState(tc.orderValueMin || "");
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(
    tc.firstTimeBuyer || "Yes (First-time buyers only)"
  );
  const [quantityMin, setQuantityMin] = useState(tc.quantityMin || "");
  const [loyaltyMilestone, setLoyaltyMilestone] = useState(tc.loyaltyMilestone || "");

  // Confetti live trigger state
  const [burstCount, setBurstCount] = useState(1);
  const [justTriggered, setJustTriggered] = useState(false);

  const submit = useSubmit();
  const navigation = useNavigation();
  const isActivating = navigation.state === "submitting";

  const triggerBurst = () => {
    setBurstCount((c) => c + 1);
    setJustTriggered(true);
    setTimeout(() => setJustTriggered(false), 1000);
    try {
      if (typeof window !== "undefined" && typeof Audio !== "undefined") {
        const audio = new Audio("/soundEffects/mixkit-magic-sparkle-touch-3083.mp3");
        audio.volume = 0.35;
        audio.play().catch(() => {});
      }
    } catch {}
  };

  const handleActivate = () => {
    const formData = new FormData();
    if (effect?.id) {
      formData.append("effectId", effect.id);
    }
    formData.append("name", effect?.name || template.name);
    formData.append("triggerEvent", triggerEvent);
    formData.append("intensity", intensity.toString());
    formData.append("shape", template.shapes.join(","));
    formData.append("mode", template.mode);
    formData.append("useBrandColor", useBrandColors ? "true" : "false");
    formData.append(
      "colors",
      JSON.stringify(useBrandColors ? detectedBrandColors : template.colors)
    );
    formData.append("preMade", "true");

    const conditionData = {
      productTagOp,
      productTagVal,
      discountOp,
      discountVal,
      orderValueMin,
      firstTimeBuyer,
      quantityMin,
      loyaltyMilestone,
    };
    formData.append("triggerConditions", JSON.stringify(conditionData));

    submit(formData, { method: "post" });
  };

  const activeColors = useBrandColors ? detectedBrandColors : template.colors;
  const activePrimaryColor = useBrandColors ? brandPrimaryColor : template.primaryColor;
  const mockContent = PRESET_MOCK_CONTENT[templateKey] || PRESET_MOCK_CONTENT.sale;

  return (
    <div
      className="min-h-screen w-full bg-[#f1f1f1] p-4 sm:p-6 md:p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Top Navigation & Header ── */}
        <div>
          {/* Back link */}
          <Link
            to={`/app/premade${queryStr}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3 group"
            style={{ textDecoration: "none" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to premade library</span>
          </Link>

          {/* Title row with icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-xl shrink-0">
              {template.icon}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Edit: {template.title}
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5">
            {template.subtitle}
          </p>
        </div>

        {/* ── Main 2-Column Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column: Edit Controls (Color, Intensity, Applies To) ── */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
            {/* 1. Color Section */}
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0f172a] mb-3">Color</h2>
              <div className="border border-slate-200/90 rounded-2xl p-3.5 bg-white hover:border-slate-300 transition-colors space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* <div
                      className="w-9 h-9 rounded-full shrink-0 shadow-xs transition-colors duration-200 border-2 border-white ring-2 ring-slate-200/70"
                      style={{
                        backgroundColor: useBrandColors ? brandPrimaryColor : template.primaryColor,
                      }}
                    /> */}
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#0f172a] flex items-center gap-2">
                        <span>Use my brand colors</span>
                        {useBrandColors && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                            {themeName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {useBrandColors
                          ? `Confetti matches your storefront palette (${themeName})`
                          : "Off uses the preset template colors shown on the right"}
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={useBrandColors}
                    onChange={(e) => {
                      setUseBrandColors(e.target.checked);
                      triggerBurst();
                    }}
                    className="w-5 h-5 rounded-md border-slate-300 text-purple-600 focus:ring-purple-400/40 cursor-pointer accent-[#7c3aed] shrink-0"
                  />
                </div>

                {/* Detected Theme Palette Strip when active */}
                {useBrandColors && (
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-slate-400 mr-0.5 uppercase tracking-wider">
                        Storefront Palette:
                      </span>
                      {detectedBrandColors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-full border border-black/10 shadow-2xs hover:scale-115 transition-transform"
                          style={{ backgroundColor: color }}
                          title={`Brand color ${idx + 1}: ${color}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono font-medium">
                      {brandPrimaryColor}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Intensity Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-bold text-[#0f172a]">Intensity</span>
                <span className="text-xs font-semibold text-slate-500">
                  {INTENSITY_LABELS[intensity] || "Medium"}
                </span>
              </div>

              {/* Range Slider */}
              <div className="relative py-1">
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={intensity}
                  onChange={(e) => {
                    setIntensity(Number(e.target.value));
                    triggerBurst();
                  }}
                  className="w-full accent-[#7c3aed] cursor-pointer h-2 bg-gradient-to-r from-purple-200 to-purple-500 rounded-lg appearance-none focus:outline-none"
                />
              </div>

              <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                Controls how much confetti fires, shape and motion stay as designed.
              </p>
            </div>

            {/* 3. Trigger Event (exact match to newEffect page) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Trigger event
              </label>
              <div className="relative">
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 transition-all pr-9 cursor-pointer font-medium"
                >
                  <option value="Order created">Order created</option>
                  <option value="Page viewed">Page viewed</option>
                  <option value="Cart updated">Cart updated</option>
                  <option value="Customer created">Customer created</option>
                  <option value="Custom event">Custom event</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 4. Trigger Conditions (exact match to newEffect page) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">
                  Trigger conditions
                </span>
                <span
                  title="Specific criteria required to trigger the confetti"
                  className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center cursor-help select-none"
                >
                  i
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-1">
                Set the rules for when this effect should play.
              </p>

              {/* 1. ORDER CREATED */}
              {triggerEvent === "Order created" && (
                <div className="space-y-3">
                  {/* Condition: Product tag is */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Product tag is
                    </span>
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={productTagOp}
                        onChange={(e) => setProductTagOp(e.target.value)}
                        className="col-span-5 px-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Equals">Equals</option>
                        <option value="Starts with">Starts with</option>
                      </select>
                      <input
                        type="text"
                        value={productTagVal}
                        onChange={(e) => setProductTagVal(e.target.value)}
                        placeholder="e.g. birthday, sale"
                        className="col-span-7 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Discount code used is */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Discount code used is
                    </span>
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={discountOp}
                        onChange={(e) => setDiscountOp(e.target.value)}
                        className="col-span-5 px-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Equals">Equals</option>
                      </select>
                      <input
                        type="text"
                        value={discountVal}
                        onChange={(e) => setDiscountVal(e.target.value)}
                        placeholder="e.g. WELCOME10"
                        className="col-span-7 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Order value is at least */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Order value is at least
                    </span>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                        ₹
                      </div>
                      <input
                        type="number"
                        value={orderValueMin}
                        onChange={(e) => setOrderValueMin(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PAGE VIEWED */}
              {triggerEvent === "Page viewed" && (
                <div className="space-y-3">
                  {/* Condition: Product tag is */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Product tag is
                    </span>
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={productTagOp}
                        onChange={(e) => setProductTagOp(e.target.value)}
                        className="col-span-5 px-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Equals">Equals</option>
                        <option value="Starts with">Starts with</option>
                      </select>
                      <input
                        type="text"
                        value={productTagVal}
                        onChange={(e) => setProductTagVal(e.target.value)}
                        placeholder="e.g. new-arrival, sale"
                        className="col-span-7 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Customer is first-time buyer */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Customer is first-time buyer
                    </span>
                    <div className="relative">
                      <select
                        value={firstTimeBuyer}
                        onChange={(e) => setFirstTimeBuyer(e.target.value)}
                        className="w-full appearance-none px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400 pr-8 font-medium"
                      >
                        <option value="Yes (First-time buyers only)">Yes (First-time buyers only)</option>
                        <option value="No (Returning customers only)">No (Returning customers only)</option>
                        <option value="Any customer">Any customer</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CART UPDATED */}
              {triggerEvent === "Cart updated" && (
                <div className="space-y-3">
                  {/* Condition: Product tag is */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Product tag is
                    </span>
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={productTagOp}
                        onChange={(e) => setProductTagOp(e.target.value)}
                        className="col-span-5 px-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Equals">Equals</option>
                        <option value="Starts with">Starts with</option>
                      </select>
                      <input
                        type="text"
                        value={productTagVal}
                        onChange={(e) => setProductTagVal(e.target.value)}
                        placeholder="e.g. featured, sale"
                        className="col-span-7 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Order value is at least */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Order value is at least
                    </span>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                        ₹
                      </div>
                      <input
                        type="number"
                        value={orderValueMin}
                        onChange={(e) => setOrderValueMin(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Quantity purchased is at least */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Quantity purchased is at least
                    </span>
                    <input
                      type="number"
                      value={quantityMin}
                      onChange={(e) => setQuantityMin(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* 4. CUSTOMER CREATED */}
              {triggerEvent === "Customer created" && (
                <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-2xl">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">🎉</span>
                    <div>
                      <span className="block text-xs font-bold text-purple-900">
                        No conditions required
                      </span>
                      <p className="text-[11px] text-purple-700 font-medium mt-0.5 leading-relaxed">
                        Fires unconditionally on customer signup. This is meant to be a simple &ldquo;welcome&rdquo; celebration moment for new shoppers, so adding filters here doesn&apos;t add real value.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. CUSTOM EVENT */}
              {triggerEvent === "Custom event" && (
                <div className="space-y-3">
                  {/* Condition: Order value is at least */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Order value is at least
                    </span>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                        ₹
                      </div>
                      <input
                        type="number"
                        value={orderValueMin}
                        onChange={(e) => setOrderValueMin(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                    </div>
                  </div>

                  {/* Condition: Customer is first-time buyer */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Customer is first-time buyer
                    </span>
                    <div className="relative">
                      <select
                        value={firstTimeBuyer}
                        onChange={(e) => setFirstTimeBuyer(e.target.value)}
                        className="w-full appearance-none px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400 pr-8 font-medium"
                      >
                        <option value="Yes (First-time buyers only)">Yes (First-time buyers only)</option>
                        <option value="No (Returning customers only)">No (Returning customers only)</option>
                        <option value="Any customer">Any customer</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Condition: Loyalty milestone reached */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Loyalty milestone reached
                    </span>
                    <input
                      type="text"
                      value={loyaltyMilestone}
                      onChange={(e) => setLoyaltyMilestone(e.target.value)}
                      placeholder="e.g. VIP Tier, 500 Points, Gold status"
                      className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <p className="text-[10.5px] text-slate-500 font-normal italic mt-1 leading-snug">
                      (This is the only place loyalty integration data can flow in, since Shopify itself has no loyalty concept)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Interactive Live Preview ── */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a]">Store Preview</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Sandbox</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Desktop / Mobile Segmented Switcher */}
                <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDevice("desktop");
                      triggerBurst();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white text-purple-700 shadow-xs border border-purple-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
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
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span>Desktop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDevice("mobile");
                      triggerBurst();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white text-purple-700 shadow-xs border border-purple-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
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
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <span>Mobile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mock Storefront Window (Desktop Browser or Mobile Smartphone Frame) */}
            <div className="w-full flex justify-center items-center py-2">
              {previewDevice === "desktop" ? (
                /* ── DESKTOP BROWSER FRAME ── */
                <div className="w-full border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col transition-all duration-300">
                  {/* macOS Safari Browser Header */}
                  <div className="bg-slate-50/90 border-b border-slate-150 px-4 py-2.5 flex items-center justify-between select-none">
                    {/* Traffic Lights */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shadow-2xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block shadow-2xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-2xs" />
                    </div>

                    {/* Centered URL Bar */}
                    <div className="bg-white border border-slate-200/80 rounded-full px-3.5 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-2 shadow-2xs min-w-[210px] justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="tracking-tight text-slate-600">yourstore.com</span>
                    </div>

                    {/* Right mock actions */}
                    <div className="flex items-center gap-2 text-slate-400">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    </div>
                  </div>

                  {/* Desktop Store Body */}
                  <div
                    onClick={triggerBurst}
                    title="Click anywhere to replay celebration"
                    className="relative p-5 sm:p-6 bg-gradient-to-b from-white to-slate-50/60 min-h-[410px] flex flex-col justify-between cursor-pointer select-none overflow-hidden"
                  >
                    {/* Desktop Store Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative z-10 pointer-events-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs"
                          style={{ backgroundColor: activePrimaryColor }}
                        >
                          {template.icon}
                        </div>
                        <span className="font-extrabold text-sm text-slate-800 tracking-tight">Your Store</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                        <span className="text-slate-700">Shop</span>
                        <span>New</span>
                        <span>Sale</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-slate-600 text-[11px] font-bold">
                          <span>🛒</span>
                          <span>1</span>
                        </div>
                      </div>
                    </div>

                    {/* Celebratory Hero Banner */}
                    <div className="text-center py-5 my-auto relative z-10 pointer-events-none">
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-2xs"
                        style={{
                          backgroundColor: `${activePrimaryColor}15`,
                          color: activePrimaryColor,
                        }}
                      >
                        <span>{mockContent.badge}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {mockContent.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto">
                        {mockContent.subtitle}
                      </p>
                      <div className="mt-3.5 inline-block">
                        <span
                          className="px-4 py-1.5 rounded-xl font-bold text-xs shadow-sm text-white"
                          style={{ backgroundColor: activePrimaryColor }}
                        >
                          {mockContent.tag}
                        </span>
                      </div>
                    </div>

                    {/* Desktop 4-Product Showcase Grid */}
                    <div className="grid grid-cols-4 gap-3 pt-3 relative z-10 pointer-events-none">
                      {mockContent.products.map((prod, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200/70 rounded-xl p-3 flex flex-col items-center justify-between aspect-square shadow-2xs transition-transform hover:scale-[1.02]"
                        >
                          <span className="text-2xl pt-1">{prod.icon}</span>
                          <div className="text-center w-full">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{prod.title}</p>
                            <p className="text-[10px] font-semibold text-purple-600">{prod.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Confetti Physics Canvas Engine */}
                    <ConfettiCanvas
                      key={`desktop_${burstCount}`}
                      shapes={template.shapes}
                      colors={activeColors}
                      intensity={intensity}
                      mode={template.mode}
                      triggerKey={burstCount}
                      device="desktop"
                    />

                    {/* Mode Tag in top-right of preview */}
                    {/* <div
                      className="absolute top-3 right-3 bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 select-none pointer-events-auto cursor-pointer transition-all hover:scale-105 active:scale-95 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerBurst();
                      }}
                      title="Click to replay confetti animation"
                      >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{template.mode} Mode</span>
                      <span className="text-purple-300 text-xs font-bold">↻ Replay</span>
                    </div> */}
                  </div>
                </div>
              ) : (
                /* ── MOBILE SMARTPHONE SHOWCASE STAGE (iPHONE STYLE) ── */
                <div className="w-full bg-gradient-to-b from-slate-100/90 via-slate-50/70 to-slate-100/80 border border-slate-200/80 rounded-2xl p-4 sm:p-7 flex flex-col justify-center items-center relative overflow-hidden">
                  {/* Subtle Studio Grid Backdrop */}
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(#94a3b8 1.2px, transparent 1.2px)",
                      backgroundSize: "16px 16px",
                    }}
                  />

                  {/* Smartphone Chassis Frame */}
                  <div className="relative w-[280px] sm:w-[292px] rounded-[48px] p-[8px] bg-gradient-to-b from-[#2e2e34] via-[#1c1c20] to-[#121214] shadow-[0_22px_55px_-12px_rgba(15,23,42,0.38),0_0_0_1px_rgba(255,255,255,0.12)_inset] transition-all duration-300 select-none z-10">
                    {/* Hardware Buttons - Left Edge */}
                    <div className="absolute -left-[2.5px] top-[72px] w-[2.5px] h-6 bg-[#3d3d44] rounded-l-xs" />
                    <div className="absolute -left-[2.5px] top-[108px] w-[2.5px] h-9 bg-[#3d3d44] rounded-l-xs" />
                    <div className="absolute -left-[2.5px] top-[148px] w-[2.5px] h-9 bg-[#3d3d44] rounded-l-xs" />
                    {/* Hardware Button - Right Edge (Power) */}
                    <div className="absolute -right-[2.5px] top-[118px] w-[2.5px] h-12 bg-[#3d3d44] rounded-r-xs" />

                    {/* Inner Screen Display */}
                    <div className="relative rounded-[40px] overflow-hidden bg-white flex flex-col border border-black/15 shadow-inner">
                      {/* iOS Status Bar */}
                      <div className="bg-slate-900 pt-2 pb-1.5 px-4 flex items-center justify-between select-none relative z-30">
                        <span className="text-[11px] font-bold text-white tracking-tight pl-1 font-mono">9:41</span>

                        {/* Dynamic Island */}
                        <div className="w-22 h-4 bg-black rounded-full flex items-center justify-between px-2 shadow-inner ring-1 ring-white/10">
                          <span className="w-2 h-2 rounded-full bg-[#18181b] border border-slate-700/60 flex items-center justify-center">
                            <span className="w-0.5 h-0.5 rounded-full bg-blue-500/80" />
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#121214]" />
                        </div>

                        {/* iOS Status Icons */}
                        <div className="flex items-center gap-1.5 text-white pr-1">
                          {/* 4-bar cellular signal */}
                          <div className="flex items-end gap-[1.5px] h-2.5">
                            <span className="w-[2px] h-1 bg-white rounded-xs" />
                            <span className="w-[2px] h-1.5 bg-white rounded-xs" />
                            <span className="w-[2px] h-2 bg-white rounded-xs" />
                            <span className="w-[2px] h-2.5 bg-white rounded-xs" />
                          </div>
                          {/* Wi-Fi */}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4z" />
                          </svg>
                          {/* Battery */}
                          <div className="w-4 h-2 border border-white/80 rounded-[2.5px] p-[1px] flex items-center">
                            <div className="w-2.5 h-full bg-white rounded-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* Mobile Safari Address Bar */}
                      <div className="bg-slate-800/95 px-3 py-1.5 flex items-center justify-between border-b border-slate-700/60 select-none text-[10px] text-slate-400">
                        <span className="text-[9px] font-semibold text-slate-400 tracking-tight">AA</span>
                        <div className="bg-slate-900/90 rounded-full px-3 py-0.5 text-[9.5px] text-slate-200 font-medium flex items-center gap-1.5 shadow-inner">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="tracking-tight text-slate-300">yourstore.com</span>
                        </div>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                        </svg>
                      </div>

                      {/* Mobile Store Body */}
                      <div
                        onClick={triggerBurst}
                        title="Tap anywhere to replay celebration"
                        className="relative p-3.5 bg-gradient-to-b from-white to-slate-50/70 min-h-[440px] flex flex-col justify-between cursor-pointer select-none overflow-hidden"
                      >
                        {/* Mobile Store Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 relative z-10 pointer-events-none">
                          <div className="flex items-center gap-2">
                            <div className="text-slate-600 font-bold text-xs">☰</div>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-white text-[10px]"
                                style={{ backgroundColor: activePrimaryColor }}
                              >
                                {template.icon}
                              </div>
                              <span className="font-extrabold text-xs text-slate-800">Your Store</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">🔍</span>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 text-[9.5px] font-bold">
                              <span>🛒</span>
                              <span>1</span>
                            </div>
                          </div>
                        </div>

                        {/* Celebratory Hero Banner (Mobile) */}
                        <div className="text-center py-3 my-auto relative z-10 pointer-events-none">
                          <div
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1 shadow-2xs"
                            style={{
                              backgroundColor: `${activePrimaryColor}15`,
                              color: activePrimaryColor,
                            }}
                          >
                            <span>{mockContent.badge}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                            {mockContent.title}
                          </h3>
                          <p className="text-[10.5px] text-slate-500 font-medium mt-0.5 line-clamp-2">
                            {mockContent.subtitle}
                          </p>
                          <div className="mt-2">
                            <span
                              className="px-3 py-1 rounded-lg font-bold text-[9.5px] text-white shadow-xs inline-block"
                              style={{ backgroundColor: activePrimaryColor }}
                            >
                              {mockContent.tag}
                            </span>
                          </div>
                        </div>

                        {/* Mobile 2-Product Showcase Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-1 relative z-10 pointer-events-none">
                          {mockContent.products.slice(0, 2).map((prod, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200/90 rounded-xl p-2 flex flex-col items-center justify-between aspect-square shadow-2xs"
                            >
                              <span className="text-2xl pt-0.5">{prod.icon}</span>
                              <div className="text-center w-full">
                                <p className="text-[9.5px] font-bold text-slate-800 truncate">{prod.title}</p>
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  <span className="text-[9.5px] font-bold text-purple-600">{prod.price}</span>
                                  <span className="text-[8px] text-amber-500 font-semibold">★ 4.9</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Mobile Store Bottom Tab Bar */}
                        <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-around text-[9px] font-semibold text-slate-400 relative z-10 pointer-events-none">
                          <span className="text-purple-600 font-bold flex flex-col items-center">
                            <span>🏠</span>
                            <span>Home</span>
                          </span>
                          <span className="flex flex-col items-center">
                            <span>🛍️</span>
                            <span>Shop</span>
                          </span>
                          <span className="flex flex-col items-center">
                            <span>❤️</span>
                            <span>Saved</span>
                          </span>
                          <span className="flex flex-col items-center">
                            <span>👤</span>
                            <span>Account</span>
                          </span>
                        </div>

                        {/* Confetti Physics Canvas for Mobile */}
                        <ConfettiCanvas
                          key={`mobile_${burstCount}`}
                          shapes={template.shapes}
                          colors={activeColors}
                          intensity={intensity}
                          mode={template.mode}
                          triggerKey={burstCount}
                          device="mobile"
                        />
                      </div>

                      {/* iOS Home Indicator Bar */}
                      <div className="bg-white py-1 flex justify-center items-center">
                        <div className="w-24 h-1 bg-slate-900/60 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Tap hint cue beneath phone */}
                  <div
                    onClick={triggerBurst}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-purple-700 text-[11px] font-medium border border-slate-200/80 shadow-2xs cursor-pointer transition-all hover:scale-105 select-none z-10"
                    title="Click to replay confetti celebration"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Tap phone to replay animation</span>
                    <span className="text-purple-600 font-bold">↻</span>
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================= */}
            {/* ENHANCED PREVIEW EFFECT & ACTION BAR                    */}
            {/* ======================================================= */}
            <div className="space-y-3 pt-3">
              {/* Main Interactive "Preview effect" Trigger Button */}
              <button
                type="button"
                onClick={triggerBurst}
                className={`w-full group relative overflow-hidden font-bold text-sm px-6 py-3.5 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 select-none active:scale-[0.98] border-2 shadow-xs ${
                  justTriggered
                    ? "bg-[#6d28d9] text-white border-[#6d28d9] shadow-md shadow-purple-500/25 scale-[1.01]"
                    : "bg-gradient-to-r from-purple-50/80 via-white to-purple-50/80 hover:from-purple-100/70 hover:to-purple-50 border-purple-300 hover:border-purple-500 text-purple-700 hover:shadow-md hover:shadow-purple-500/15"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform duration-300 ${
                    justTriggered
                      ? "scale-125 bg-white/20 text-white rotate-12"
                      : "bg-purple-100 text-purple-700 group-hover:scale-115"
                  }`}
                >
                  {justTriggered ? "🎉" : "▶"}
                </span>
                <span className="tracking-tight text-[13.5px]">
                  {justTriggered ? "Celebration Fired!" : "Preview effect"}
                </span>
                <span
                  className={`text-sm transition-transform duration-300 ${
                    justTriggered ? "scale-125 animate-bounce" : "group-hover:rotate-12"
                  }`}
                >
                  ✨
                </span>
              </button>

              {/* Action Buttons: Cancel and Activate */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-[11.5px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{template.title} preset ready to publish</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Link
                    to={`/app/premade${queryStr}`}
                    className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 text-slate-700 font-semibold text-xs sm:text-[13px] px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center select-none shadow-2xs text-center"
                    style={{ textDecoration: "none" }}
                  >
                    <span>Cancel</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="flex-1 sm:flex-initial bg-[#4d319e] hover:bg-[#3f2485] active:scale-[0.98] text-white font-bold text-xs sm:text-[13px] px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    style={{
                      boxShadow: "0 4px 14px rgba(77, 49, 158, 0.22)",
                    }}
                  >
                    {isActivating ? (
                      <>
                        <ButtonSpinner className="w-3.5 h-3.5 text-white" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate effect</span>
                        <span className="text-sm leading-none">🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confetti Canvas Component with Real-Time Physics Tailored Per Preset ──
interface ConfettiCanvasProps {
  shapes: string[];
  colors: string[];
  intensity: number;
  mode: "Falling" | "Cannon" | "Fountain" | "Fireworks" | "Burst";
  triggerKey: number;
  device?: "desktop" | "mobile";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  shape: string;
  rotation: number;
  rotSpeed: number;
  scaleX: number;
  scaleY: number;
  scaleSpeedX: number;
  scaleSpeedY: number;
  gravity: number;
  drag: number;
  opacity: number;
  life: number;
  maxLife: number;
  swaySpeed?: number;
  swayAmp?: number;
  swayOffset?: number;
}

function ConfettiCanvas({ shapes, colors, intensity, mode, triggerKey, device }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    const rect = parent?.getBoundingClientRect();
    const width = rect && rect.width > 50 ? Math.round(rect.width) : (device === "mobile" ? 280 : 580);
    const height = rect && rect.height > 50 ? Math.round(rect.height) : (device === "mobile" ? 440 : 410);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const intensityScale = [0.8, 1.2, 1.8, 2.5][intensity - 1] || 1.2;
    const startTime = performance.now();
    const durationMs = 3800;

    let particles: Particle[] = [];

    // Helper to pick shape from preset's shapes
    const getRandomShape = () => shapes[Math.floor(Math.random() * shapes.length)] || "circle";
    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

    // ── INITIAL FRAME-0 SPAWN PER MODE ──
    if (mode === "Burst") {
      // Gentle radial burst from center (Anniversary)
      const count = Math.round(65 * intensityScale);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 2.5;
        particles.push({
          x: width / 2,
          y: height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.8,
          color: getRandomColor(),
          size: Math.random() * 5 + 7,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.18,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.03 + 0.015,
          scaleSpeedY: Math.random() * 0.025 + 0.012,
          gravity: 0.14,
          drag: 0.965,
          opacity: 1,
          life: 0,
          maxLife: 2800,
        });
      }
    } else if (mode === "Cannon") {
      // Immediate dual cannon blast from bottom corners on frame 0
      const volleyCount = Math.round(24 * intensityScale);
      const baseSpeed = Math.sqrt(height * 0.52);

      // Left Cannon: blasts up & right
      for (let i = 0; i < volleyCount; i++) {
        const angle = -Math.PI * 0.28 + (Math.random() - 0.5) * 0.35;
        const speed = baseSpeed * (0.85 + Math.random() * 0.35);
        particles.push({
          x: 0,
          y: height - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: getRandomColor(),
          size: Math.random() * 5 + 6,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.035 + 0.015,
          scaleSpeedY: Math.random() * 0.03 + 0.01,
          gravity: 0.22,
          drag: 0.982,
          swayAmp: Math.random() * 10 + 5,
          swaySpeed: Math.random() * 0.02 + 0.01,
          swayOffset: Math.random() * Math.PI * 2,
          opacity: 1,
          life: 0,
          maxLife: 2700,
        });
      }

      // Right Cannon: blasts up & left
      for (let i = 0; i < volleyCount; i++) {
        const angle = -Math.PI * 0.72 + (Math.random() - 0.5) * 0.35;
        const speed = baseSpeed * (0.85 + Math.random() * 0.35);
        particles.push({
          x: width,
          y: height - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: getRandomColor(),
          size: Math.random() * 5 + 6,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.035 + 0.015,
          scaleSpeedY: Math.random() * 0.03 + 0.01,
          gravity: 0.22,
          drag: 0.982,
          swayAmp: Math.random() * 10 + 5,
          swaySpeed: Math.random() * 0.02 + 0.01,
          swayOffset: Math.random() * Math.PI * 2,
          opacity: 1,
          life: 0,
          maxLife: 2700,
        });
      }
    } else if (mode === "Falling") {
      // Pre-seed 40 snowflakes across canvas on frame 0
      const initialCount = Math.round(35 * intensityScale);
      for (let i = 0; i < initialCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.85,
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 1.4 + 1.1,
          color: getRandomColor(),
          size: Math.random() * 5 + 6,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.05 + 0.02,
          scaleSpeedY: Math.random() * 0.04 + 0.015,
          gravity: 0.02,
          drag: 0.992,
          swayAmp: Math.random() * 16 + 10,
          swaySpeed: Math.random() * 0.035 + 0.015,
          swayOffset: Math.random() * Math.PI * 2,
          opacity: 1,
          life: 0,
          maxLife: 3200,
        });
      }
    } else if (mode === "Fountain") {
      // Pre-burst 40 particles rising from bottom center on frame 0
      const fountainBurst = Math.round(35 * intensityScale);
      for (let i = 0; i < fountainBurst; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
        const targetRise = Math.max(120, height * 0.75);
        const baseSpeed = Math.sqrt(targetRise * 1.15);
        const speed = baseSpeed * (0.8 + Math.random() * 0.35);
        particles.push({
          x: width / 2 + (Math.random() - 0.5) * Math.min(50, width * 0.2),
          y: height - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: getRandomColor(),
          size: Math.random() * 5 + 6,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.25,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.07 + 0.03,
          scaleSpeedY: Math.random() * 0.05 + 0.02,
          gravity: 0.24,
          drag: 0.985,
          opacity: 1,
          life: 0,
          maxLife: 2600,
        });
      }
    } else if (mode === "Fireworks") {
      // Frame 0 central burst
      const burstParticles = Math.round(32 * intensityScale);
      for (let p = 0; p < burstParticles; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.8 + 2.2;
        particles.push({
          x: width * 0.5,
          y: height * 0.32,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: getRandomColor(),
          size: Math.random() * 5 + 6,
          shape: getRandomShape(),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          scaleX: 1,
          scaleY: 1,
          scaleSpeedX: Math.random() * 0.09 + 0.04,
          scaleSpeedY: Math.random() * 0.07 + 0.03,
          gravity: 0.12,
          drag: 0.95,
          opacity: 1,
          life: 0,
          maxLife: 1600,
        });
      }
    }

    let lastTime = performance.now();
    let lastFireworkIndex = -1;
    let lastCannonVolley = -1;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const dt = Math.min((now - lastTime) / 16.66, 2.5);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // ── CONTINUOUS SPAWNERS ──
      if (elapsed < durationMs) {
        // Cannon Mode (volleys from bottom corners across screen)
        if (mode === "Cannon" && elapsed < durationMs * 0.85 && elapsed > 200) {
          const cannonInterval = 380;
          const currentVolley = Math.floor(elapsed / cannonInterval);
          if (currentVolley > lastCannonVolley) {
            lastCannonVolley = currentVolley;
            const volleyCount = Math.round(20 * intensityScale);
            const baseSpeed = Math.sqrt(height * 0.52);

            // Left Cannon
            for (let i = 0; i < volleyCount; i++) {
              const angle = -Math.PI * 0.28 + (Math.random() - 0.5) * 0.35;
              const speed = baseSpeed * (0.85 + Math.random() * 0.35);
              particles.push({
                x: 0,
                y: height - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: getRandomColor(),
                size: Math.random() * 5 + 6,
                shape: getRandomShape(),
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                scaleX: 1,
                scaleY: 1,
                scaleSpeedX: Math.random() * 0.035 + 0.015,
                scaleSpeedY: Math.random() * 0.03 + 0.01,
                gravity: 0.22,
                drag: 0.982,
                swayAmp: Math.random() * 10 + 5,
                swaySpeed: Math.random() * 0.02 + 0.01,
                swayOffset: Math.random() * Math.PI * 2,
                opacity: 1,
                life: 0,
                maxLife: 2700,
              });
            }

            // Right Cannon
            for (let i = 0; i < volleyCount; i++) {
              const angle = -Math.PI * 0.72 + (Math.random() - 0.5) * 0.35;
              const speed = baseSpeed * (0.85 + Math.random() * 0.35);
              particles.push({
                x: width,
                y: height - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: getRandomColor(),
                size: Math.random() * 5 + 6,
                shape: getRandomShape(),
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                scaleX: 1,
                scaleY: 1,
                scaleSpeedX: Math.random() * 0.035 + 0.015,
                scaleSpeedY: Math.random() * 0.03 + 0.01,
                gravity: 0.22,
                drag: 0.982,
                swayAmp: Math.random() * 10 + 5,
                swaySpeed: Math.random() * 0.02 + 0.01,
                swayOffset: Math.random() * Math.PI * 2,
                opacity: 1,
                life: 0,
                maxLife: 2700,
              });
            }
          }
        }

        // Falling (Christmas: steady snowflakes falling)
        if (mode === "Falling") {
          const spawnCount = Math.round(2 * intensityScale);
          for (let i = 0; i < spawnCount; i++) {
            particles.push({
              x: Math.random() * width,
              y: -15,
              vx: (Math.random() - 0.5) * 1.2,
              vy: Math.random() * 1.6 + 1.2,
              color: getRandomColor(),
              size: Math.random() * 5 + 6,
              shape: getRandomShape(),
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.12,
              scaleX: 1,
              scaleY: 1,
              scaleSpeedX: Math.random() * 0.05 + 0.02,
              scaleSpeedY: Math.random() * 0.04 + 0.015,
              gravity: 0.02,
              drag: 0.992,
              swayAmp: Math.random() * 16 + 10,
              swaySpeed: Math.random() * 0.035 + 0.015,
              swayOffset: Math.random() * Math.PI * 2,
              opacity: 1,
              life: 0,
              maxLife: 3200,
            });
          }
        }

        // Fountain (Diwali: rising continuously from bottom center)
        if (mode === "Fountain" && elapsed < durationMs * 0.85) {
          const spawnCount = Math.round(3.5 * intensityScale);
          for (let i = 0; i < spawnCount; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
            const targetRise = Math.max(120, height * 0.75);
            const baseSpeed = Math.sqrt(targetRise * 1.15);
            const speed = baseSpeed * (0.8 + Math.random() * 0.35);
            particles.push({
              x: width / 2 + (Math.random() - 0.5) * Math.min(50, width * 0.2),
              y: height - 10,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: getRandomColor(),
              size: Math.random() * 5 + 6,
              shape: getRandomShape(),
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.25,
              scaleX: 1,
              scaleY: 1,
              scaleSpeedX: Math.random() * 0.07 + 0.03,
              scaleSpeedY: Math.random() * 0.05 + 0.02,
              gravity: 0.24,
              drag: 0.985,
              opacity: 1,
              life: 0,
              maxLife: 2600,
            });
          }
        }

        // Fireworks (New Year: sequential sky bursts)
        if (mode === "Fireworks" && elapsed < durationMs) {
          const fireworkInterval = 460;
          const currentFirework = Math.floor(elapsed / fireworkInterval);
          if (currentFirework > lastFireworkIndex) {
            lastFireworkIndex = currentFirework;

            const fireworkPositions = [
              { x: width * 0.3, y: height * 0.28 },
              { x: width * 0.7, y: height * 0.24 },
              { x: width * 0.5, y: height * 0.38 },
              { x: width * 0.25, y: height * 0.44 },
              { x: width * 0.75, y: height * 0.4 },
              { x: width * 0.4, y: height * 0.2 },
            ];
            const targetPos = fireworkPositions[currentFirework % fireworkPositions.length];
            const burstParticles = Math.round(26 * intensityScale);

            for (let p = 0; p < burstParticles; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 4.6 + 2.2;
              particles.push({
                x: targetPos.x,
                y: targetPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: getRandomColor(),
                size: Math.random() * 5 + 6,
                shape: getRandomShape(),
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                scaleX: 1,
                scaleY: 1,
                scaleSpeedX: Math.random() * 0.09 + 0.04,
                scaleSpeedY: Math.random() * 0.07 + 0.03,
                gravity: 0.12,
                drag: 0.95,
                opacity: 1,
                life: 0,
                maxLife: 1600,
              });
            }
          }
        }
      }

      // ── SIMULATION & DRAW WITH 3D PERSPECTIVE TUMBLING ──
      particles = particles.filter((p) => {
        p.life += dt * 16.66;
        if (p.life >= p.maxLife) return false;

        p.vx *= Math.pow(p.drag, dt);
        p.vy *= Math.pow(p.drag, dt);
        p.vy += p.gravity * dt;

        if (p.swayAmp && p.swaySpeed && p.swayOffset !== undefined) {
          p.x += p.vx * dt + Math.sin(p.life * p.swaySpeed + p.swayOffset) * (p.swayAmp * 0.05);
        } else {
          p.x += p.vx * dt;
        }
        p.y += p.vy * dt;

        p.rotation += p.rotSpeed * dt;
        p.scaleX = Math.cos(p.life * p.scaleSpeedX);
        p.scaleY = Math.sin(p.life * p.scaleSpeedY);

        const remaining = 1 - p.life / p.maxLife;
        p.opacity = Math.max(0, Math.min(1, remaining * 1.5));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scaleX, p.scaleY);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        // Render appropriate shape
        if (p.shape === "snowflake") {
          drawSnowflake(ctx, p.size);
        } else if (p.shape === "rectangle") {
          drawRectangle(ctx, p.size, p.color);
        } else if (p.shape === "tag") {
          drawTag(ctx, p.size, p.color);
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, 5, p.size * 0.58, p.size * 0.28);
        } else if (p.shape === "heart") {
          drawHeart(ctx, 0, 0, p.size);
        } else {
          // Circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      if (particles.length > 0 || elapsed < durationMs) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [triggerKey, colors, intensity, shapes, mode, device]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}

// ── CUSTOM SHAPE DRAWING HELPERS ──

// 1. Delicate 6-Point Snowflake
function drawSnowflake(ctx: CanvasRenderingContext2D, size: number) {
  const r = size * 0.65;
  ctx.save();
  ctx.lineWidth = Math.max(1.4, size * 0.12);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "round";

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.moveTo(0, 0);
    ctx.lineTo(cos * r, sin * r);

    // Branchlets
    const bDist = r * 0.6;
    const bLen = r * 0.35;
    const bX = cos * bDist;
    const bY = sin * bDist;
    const bAngle1 = angle + Math.PI / 4;
    const bAngle2 = angle - Math.PI / 4;
    ctx.moveTo(bX, bY);
    ctx.lineTo(bX + Math.cos(bAngle1) * bLen, bY + Math.sin(bAngle1) * bLen);
    ctx.moveTo(bX, bY);
    ctx.lineTo(bX + Math.cos(bAngle2) * bLen, bY + Math.sin(bAngle2) * bLen);
  }
  ctx.stroke();
  ctx.restore();
}

// 2. Sharp Ticket / Price Tag Rectangle
function drawRectangle(ctx: CanvasRenderingContext2D, size: number, color?: string) {
  const w = size * 0.72;
  const h = size * 1.45;
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();

  // If color is white/light, add subtle border so it's crisp on light backgrounds
  if (color && (color.toLowerCase() === "#ffffff" || color.toLowerCase() === "#fff")) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

// 3. Price Tag with Cut Corners and Hole
function drawTag(ctx: CanvasRenderingContext2D, size: number, color?: string) {
  const w = size * 0.85;
  const h = size * 1.4;
  const cut = w * 0.35;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + cut);
  ctx.lineTo(-w / 2 + cut, -h / 2);
  ctx.lineTo(w / 2 - cut, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + cut);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  // If tag is white/light, stroke border
  if (color && (color.toLowerCase() === "#ffffff" || color.toLowerCase() === "#fff")) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Small punched hole
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -h / 2 + cut * 0.85, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

// 4. Smooth Centered Heart (Spins around true center 0,0)
function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size * 0.52;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx - s * 0.8, cy - s * 1.1, cx - s * 1.4, cy - s * 0.2, cx, cy + s * 1.1);
  ctx.bezierCurveTo(cx + s * 1.4, cy - s * 0.2, cx + s * 0.8, cy - s * 1.1, cx, cy - s * 0.4);
  ctx.closePath();
  ctx.fill();
}

// 5. Crisp 5-Point Star
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}
