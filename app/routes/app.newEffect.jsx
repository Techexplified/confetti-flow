import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function NewEffect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const dashboardUrl = `/app${queryStr}`;

  // Form State matching the wireframe
  const [effectName, setEffectName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("Order created");

  // Trigger Conditions
  const [productTagOp, setProductTagOp] = useState("Contains");
  const [productTagVal, setProductTagVal] = useState("");

  const [discountOp, setDiscountOp] = useState("Contains");
  const [discountVal, setDiscountVal] = useState("");

  const [orderValueMin, setOrderValueMin] = useState("");
  const [firstTimeBuyer, setFirstTimeBuyer] = useState("Yes (First-time buyers only)");
  const [quantityMin, setQuantityMin] = useState("");
  const [loyaltyMilestone, setLoyaltyMilestone] = useState("");

  // Shape state: 'circle' | 'star' | 'heart' | 'triangle' | 'text'
  const [selectedShape, setSelectedShape] = useState("circle");
  const [customImage, setCustomImage] = useState(null);

  // Colors state
  const [useBrandColor, setUseBrandColor] = useState(true);
  const [customColors, setCustomColors] = useState([
    "#e11d48", // Magenta
    "#f472b6", // Pink
    "#fbbf24", // Yellow/Gold
    "#10b981", // Mint/Teal
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
  ]);

  // Mode & Position state
  const [mode, setMode] = useState("Burst");
  const [position, setPosition] = useState("Full screen");

  // Duration & Intensity state
  const [duration, setDuration] = useState(3);
  const [intensity, setIntensity] = useState(2); // 1: Low, 2: Medium, 3: High, 4: Extreme

  // Sound pairing state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundType, setSoundType] = useState("Soft chime");

  // Preview Device: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState("desktop");

  // Live burst trigger state
  const [burstCount, setBurstCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const intensityMap = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Extreme",
  };

  const modeDescriptions = {
    Burst: 'Fires once, all at once, radiating outward from a central point. The classic "you did it" celebratory moment.',
    Falling: 'Continuous rain-style effect for as long as the duration is set. Ambient and decorative rather than a single punchy moment.',
    Fountain: 'Pieces rise up first, then fall back down, like water from a fountain. Not offered by any competitor found in the research, genuine differentiation.',
    Cannon: 'Fires from one side or corner of the screen across it, rather than from the center outward. Feels more directional and dynamic than a symmetric burst, good for order-success moments tied to a specific button or element.',
    Fireworks: 'Multiple smaller bursts firing in sequence at different points on screen, rather than one single burst. The most visually rich option, best reserved for bigger milestones.',
  };

  const triggerBurst = () => {
    setBurstCount((prev) => prev + 1);
    if (soundEnabled) {
      playSound(soundType);
    }
  };

  const handleCustomColorAdd = (e) => {
    const newColor = e.target.value;
    if (newColor && !customColors.includes(newColor)) {
      setCustomColors([...customColors, newColor]);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setCustomImage(loadEvt.target?.result);
        setSelectedShape("custom");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (status = "draft") => {
    setIsSaving(true);
    setToastMessage(
      status === "published"
        ? "🎉 Effect published successfully!"
        : "Effect saved as draft!"
    );
    setTimeout(() => {
      navigate(dashboardUrl);
    }, 1200);
  };

  return (
    <div
      className="min-h-screen w-full bg-[#f1f1f1] p-4 sm:p-6 md:p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
            <span className="text-emerald-400 font-bold text-lg">✓</span>
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. TOP HEADER & BACK NAVIGATION                           */}
        {/* ========================================================= */}
        <div>
          <Link
            to={dashboardUrl}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors mb-2.5 group cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transform group-hover:-translate-x-1 transition-transform"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Create new effect
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Build it from scratch, every setting below is yours to customise.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 2. TWO-COLUMN WORKSPACE: SETTINGS + LIVE PREVIEW          */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ------------------------------------------------------- */}
          {/* LEFT COLUMN: EFFECT DETAILS FORM (5 cols)               */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-6 xl:col-span-5 bg-white border border-slate-200/90 rounded-[24px] p-6 sm:p-7 shadow-sm space-y-6">
            {/* Form Section Header */}
            <div>
              <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">
                Effect details
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Set up your confetti effect and define when it appears.
              </p>
            </div>

            {/* Field: Effect Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Effect name
              </label>
              <input
                type="text"
                value={effectName}
                onChange={(e) => setEffectName(e.target.value)}
                placeholder="e.g. Big order celebration"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 transition-all"
              />
            </div>

            {/* Field: Trigger Event */}
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

            {/* Field: Trigger Conditions */}
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

            {/* Field: Shape */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Shape
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShape("circle");
                    setCustomImage(null);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedShape === "circle"
                      ? "border-2 border-[#4d319e] bg-purple-50 shadow-sm"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Circle"
                >
                  <span className="w-4 h-4 rounded-full bg-[#0f172a] block"></span>
                </button>

                {/* Star */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShape("star");
                    setCustomImage(null);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedShape === "star"
                      ? "border-2 border-[#4d319e] bg-purple-50 shadow-sm"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Star"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#64748b">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>

                {/* Heart */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShape("heart");
                    setCustomImage(null);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedShape === "heart"
                      ? "border-2 border-[#4d319e] bg-purple-50 shadow-sm"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Heart"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#64748b">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>

                {/* Triangle */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShape("triangle");
                    setCustomImage(null);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedShape === "triangle"
                      ? "border-2 border-[#4d319e] bg-purple-50 shadow-sm"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Triangle"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#64748b">
                    <polygon points="12 3 22 21 2 21" />
                  </svg>
                </button>

                {/* Text / Lettering */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShape("text");
                    setCustomImage(null);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedShape === "text"
                      ? "border-2 border-[#4d319e] bg-purple-50 shadow-sm"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Text Aa"
                >
                  <span className="text-sm font-bold text-slate-600">Aa</span>
                </button>
              </div>

              {/* Upload Custom Image Box */}
              <div className="border border-purple-200/90 bg-purple-50/40 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-[#7c3aed] shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Upload your own image
                    </span>
                    <span className="block text-[11px] text-slate-500 font-medium">
                      Turn a logo or icon into a confetti shape
                    </span>
                  </div>
                </div>

                <label className="border border-[#7c3aed] text-[#7c3aed] hover:bg-purple-100/50 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0">
                  <span>{customImage ? "Change file" : "Choose file"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Field: Brand Color */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Brand color
              </label>
              <div
                onClick={() => setUseBrandColor(!useBrandColor)}
                className="border border-slate-200 rounded-2xl p-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#8b5cf6] ring-2 ring-purple-300 ring-offset-1 flex items-center justify-center shrink-0"></div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Use my store&apos;s brand colors
                    </span>
                    <span className="block text-[11px] text-slate-500 font-medium">
                      Pulled automatically from your theme
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={useBrandColor}
                  onChange={(e) => setUseBrandColor(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Field: Custom Colors */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Custom colors
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {customColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 shadow-sm cursor-pointer border border-black/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}

                {/* Add Custom Color Button with Hidden Color Picker */}
                <label
                  title="Add custom color"
                  className="w-7 h-7 rounded-full border-2 border-dashed border-purple-400 text-purple-600 hover:bg-purple-50 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                >
                  +
                  <input
                    type="color"
                    onChange={handleCustomColorAdd}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Field: Mode & Position on screen */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Mode
                </label>
                <div className="relative">
                  <select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                      setBurstCount((prev) => prev + 1);
                      if (soundEnabled) playSound(soundType);
                    }}
                    className="w-full appearance-none px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 transition-all pr-8 cursor-pointer font-medium"
                  >
                    <option value="Burst">Burst</option>
                    <option value="Falling">Falling</option>
                    <option value="Fountain">Fountain</option>
                    <option value="Cannon">Cannon</option>
                    <option value="Fireworks">Fireworks</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Position on screen */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Position on screen
                </label>
                <div className="relative">
                  <select
                    value={position}
                    onChange={(e) => {
                      setPosition(e.target.value);
                      setBurstCount((prev) => prev + 1);
                    }}
                    className="w-full appearance-none px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 transition-all pr-8 cursor-pointer font-medium"
                  >
                    <option value="Full screen">Full screen</option>
                    <option value="Center">Center</option>
                    <option value="Around button/element">Around button/element</option>
                    <option value="Top">Top</option>
                    <option value="Bottom">Bottom</option>
                    <option value="Left side">Left side</option>
                    <option value="Right side">Right side</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Description Banner */}
            <div className="px-3 py-2 bg-purple-50/50 border border-purple-200/60 rounded-xl -mt-1">
              <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                <span className="font-bold">{mode}:</span> {modeDescriptions[mode]}
              </p>
            </div>

            {/* Field: Duration */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Duration
                </label>
                <span className="text-xs font-bold text-slate-700">{duration}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
                style={{
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${((duration - 1) / 9) * 100}%, #e2e8f0 ${((duration - 1) / 9) * 100}%, #e2e8f0 100%)`,
                }}
              />
            </div>

            {/* Field: Intensity */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Intensity
                </label>
                <span className="text-xs font-bold text-slate-700">
                  {intensityMap[intensity] || "Medium"}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
                style={{
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${((intensity - 1) / 3) * 100}%, #e2e8f0 ${((intensity - 1) / 3) * 100}%, #e2e8f0 100%)`,
                }}
              />
            </div>

            {/* Field: Sound pairing */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Sound pairing
                  </label>
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      if (next) playSound(soundType);
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex items-center ${
                      soundEnabled ? "bg-[#7c3aed] justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-sm block transition-transform"></span>
                  </button>
                  <span className="text-xs text-slate-600 font-medium">
                    Play a sound with this effect
                  </span>
                </div>
              </div>

              {/* Sound Select Box */}
              <div className="transition-all duration-200">
                <div className="relative">
                  <select
                    value={soundType}
                    onChange={(e) => {
                      setSoundType(e.target.value);
                      if (soundEnabled) playSound(e.target.value);
                    }}
                    className="w-full appearance-none px-3.5 py-2.5 bg-white border-2 border-[#2563eb] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30 font-medium pr-8 cursor-pointer shadow-xs"
                  >
                    <option value="Soft chime">Soft chime</option>
                    <option value="Party horn">Party horn</option>
                    <option value="Pop & cheer">Pop & cheer</option>
                    <option value="Celebration bell">Celebration bell</option>
                    <option value="Whistle & confetti">Whistle & confetti</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Only plays reliably on click based triggers
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE PREVIEW + ACTION BUTTONS (7 cols)    */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-6 xl:col-span-7 bg-white border border-slate-200/90 rounded-[24px] p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
            {/* Header: Title + Device Switcher */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">
                  Live preview
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  See how your confetti will look on your store.
                </p>
              </div>

              {/* Desktop / Mobile Switcher */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-white text-[#4d319e] shadow-sm border border-purple-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-white text-[#4d319e] shadow-sm border border-purple-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* ======================================================= */}
            {/* BROWSER / DEVICE MOCKUP WINDOW                          */}
            {/* ======================================================= */}
            <div className="w-full flex justify-center items-center py-2">
              <div
                className={`transition-all duration-300 border border-slate-200/90 rounded-2xl bg-white shadow-inner overflow-hidden flex flex-col relative ${
                  previewDevice === "desktop"
                    ? "w-full min-h-[380px]"
                    : "w-[280px] sm:w-[300px] min-h-[420px] rounded-[32px] border-4 border-slate-800 shadow-xl"
                }`}
              >
                {/* Browser Top Bar */}
                <div className="bg-slate-50 border-b border-slate-100 px-3.5 py-2 flex items-center justify-between select-none">
                  {/* Window Controls */}
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] block"></span>
                  </div>

                  {/* Centered URL Bar */}
                  <div className="flex items-center justify-center bg-white border border-slate-200 rounded-full px-3 py-0.5 text-[10px] text-slate-500 gap-1.5 shadow-xs">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>yourstore.com</span>
                  </div>

                  <div className="w-8"></div>
                </div>

                {/* Simulated Store Body */}
                <div
                  onClick={triggerBurst}
                  title="Click anywhere to replay animation"
                  className="p-4 sm:p-6 flex-1 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-white to-slate-50/50 cursor-pointer select-none"
                >
                  {/* Store Header Skeleton */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="w-16 h-3 bg-slate-200 rounded"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-2 bg-slate-100 rounded"></div>
                      <div className="w-8 h-2 bg-slate-100 rounded"></div>
                      <div className="w-8 h-2 bg-slate-100 rounded"></div>
                    </div>
                  </div>

                  {/* Store Hero Message */}
                  <div className="text-center py-6 sm:py-8 my-auto z-10 relative">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                      Your Store
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Make it yours
                    </p>
                    <div className="w-20 h-5 bg-slate-200/90 rounded-lg mx-auto mt-3"></div>
                  </div>

                  {/* Store Product Grid Skeleton */}
                  <div
                    className={`grid gap-3 z-10 relative ${
                      previewDevice === "desktop"
                        ? "grid-cols-4"
                        : "grid-cols-2"
                    }`}
                  >
                    {/* Item 1: T-Shirt */}
                    <div className="bg-slate-100/70 border border-slate-200/50 rounded-xl p-3.5 flex flex-col items-center justify-center aspect-square">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 001 .84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.14a1 1 0 001-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
                      </svg>
                    </div>

                    {/* Item 2: Bag */}
                    <div className="bg-slate-100/70 border border-slate-200/50 rounded-xl p-3.5 flex flex-col items-center justify-center aspect-square">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 01-8 0" />
                      </svg>
                    </div>

                    {/* Item 3: Hat / Cap */}
                    <div className="bg-slate-100/70 border border-slate-200/50 rounded-xl p-3.5 flex flex-col items-center justify-center aspect-square">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                        <path d="M2 17c1.5-2 4-3 10-3s8.5 1 10 3" />
                        <path d="M12 4a8 8 0 00-8 8c0 2 1 3 2 4h12c1-1 2-2 2-4a8 8 0 00-8-8z" />
                      </svg>
                    </div>

                    {/* Item 4: Bag */}
                    {previewDevice === "desktop" && (
                      <div className="bg-slate-100/70 border border-slate-200/50 rounded-xl p-3.5 flex flex-col items-center justify-center aspect-square">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* =================================================== */}
                  {/* LIVE CONFETTI PHYSICS CANVAS ENGINE                 */}
                  {/* =================================================== */}
                  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                    <ConfettiCanvasPreview
                      mode={mode}
                      position={position}
                      duration={duration}
                      intensity={intensity}
                      shape={selectedShape}
                      colors={customColors}
                      customImage={customImage}
                      triggerKey={burstCount}
                    />

                    {/* Mode Tag in top-right of preview */}
                    <div
                      className="absolute top-2.5 right-2.5 bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 select-none pointer-events-auto cursor-pointer transition-all hover:scale-105 active:scale-95 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerBurst();
                      }}
                      title="Click to replay this mode"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{mode} Mode</span>
                      <span className="text-purple-300 text-xs font-bold">↻ Replay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================= */}
            {/* BOTTOM ACTION BUTTONS: PREVIEW, DRAFT, PUBLISH          */}
            {/* ======================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Button 1: Preview effect ✨ */}
              <button
                type="button"
                onClick={triggerBurst}
                className="bg-[#f3e8ff] hover:bg-[#ebd5ff] active:scale-[0.98] text-[#6d28d9] font-bold text-[13.5px] px-4 py-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
              >
                <span>▶ Preview effect</span>
                <span>✨</span>
              </button>

              {/* Button 2: Save as draft */}
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
                className="bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-300 text-slate-700 font-semibold text-[13.5px] px-4 py-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center select-none"
              >
                <span>Save as draft</span>
              </button>

              {/* Button 3: Publish effect 🚀 */}
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isSaving}
                className="bg-[#4d319e] hover:bg-[#3f2485] active:scale-[0.98] text-white font-bold text-[13.5px] px-5 py-3 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
                style={{
                  boxShadow: "0 4px 14px rgba(77, 49, 158, 0.25)",
                }}
              >
                <span>Publish effect</span>
                <span>🚀</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Single Confetti Particle Rendering based on Shape
function ConfettiParticle({ shape, color, x, y, rot, size, customImage }) {
  if (customImage) {
    return (
      <img
        src={customImage}
        alt="confetti"
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `rotate(${rot})`,
          width: `${size + 4}px`,
          height: `${size + 4}px`,
          objectFit: "contain",
        }}
      />
    );
  }

  if (shape === "circle") {
    return (
      <span
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `rotate(${rot})`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: "50%",
          display: "block",
        }}
      />
    );
  }

  if (shape === "star") {
    return (
      <svg
        width={size + 2}
        height={size + 2}
        viewBox="0 0 24 24"
        fill={color}
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `rotate(${rot})`,
        }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  if (shape === "heart") {
    return (
      <svg
        width={size + 2}
        height={size + 2}
        viewBox="0 0 24 24"
        fill={color}
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `rotate(${rot})`,
        }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  if (shape === "triangle") {
    return (
      <svg
        width={size + 2}
        height={size + 2}
        viewBox="0 0 24 24"
        fill={color}
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `rotate(${rot})`,
        }}
      >
        <polygon points="12 3 22 21 2 21" />
      </svg>
    );
  }

  // Text shape
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rot})`,
        color: color,
        fontWeight: "bold",
        fontSize: `${size}px`,
        lineHeight: 1,
      }}
    >
      🎉
    </span>
  );
}

// Audio synthesizer for sound pairing
function playSound(type) {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();

    if (type === "Soft chime" || type === "Celebration bell") {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + idx * 0.09 + 0.5
        );
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.09);
        osc.stop(audioCtx.currentTime + idx * 0.09 + 0.5);
      });
    } else if (type === "Pop & cheer") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } else if (type === "Party horn") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(293.66, audioCtx.currentTime); // D4
      osc.frequency.linearRampToValueAtTime(392.0, audioCtx.currentTime + 0.3); // G4
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else {
      // Whistle & confetti
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    }
  } catch (err) {
    console.error("Audio playback error", err);
  }
}

// Canvas Physics Confetti Simulator animating all 5 modes
function ConfettiCanvasPreview({
  mode = "Burst",
  position = "Full screen",
  duration = 3,
  intensity = 2,
  shape = "circle",
  colors = ["#e11d48", "#f472b6", "#fbbf24", "#10b981", "#3b82f6", "#8b5cf6"],
  customImage = null,
  triggerKey = 0,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const imgRef = useRef(null);

  // Preload custom image if provided
  useEffect(() => {
    if (customImage) {
      const img = new Image();
      img.src = customImage;
      img.onload = () => {
        imgRef.current = img;
      };
    } else {
      imgRef.current = null;
    }
  }, [customImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || parent?.clientWidth || 420;
    const height = rect.height || parent?.clientHeight || 360;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    let particles = [];
    const startTime = performance.now();
    const durationMs = duration * 1000;
    const intensityScale = [0.7, 1.0, 1.5, 2.2][intensity - 1] || 1.0;

    // Determine origin coordinates based on position setting
    const getOrigin = () => {
      let ox = width / 2;
      let oy = height / 2;
      if (position === "Around button/element") {
        ox = width / 2;
        oy = height * 0.44; // store CTA button
      } else if (position === "Top") {
        oy = height * 0.22;
      } else if (position === "Bottom") {
        oy = height * 0.78;
      } else if (position === "Left side") {
        ox = width * 0.22;
      } else if (position === "Right side") {
        ox = width * 0.78;
      }
      return { ox, oy };
    };

    const { ox, oy } = getOrigin();

    // 1. BURST MODE: Fires once, all at once, radiating outward from a central point
    if (mode === "Burst") {
      const count = Math.round(75 * intensityScale);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 8.5 + 4.5) * (0.85 + intensityScale * 0.15);
        particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          color: colors[i % colors.length],
          size: Math.random() * 5 + 7,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          scaleX: 1,
          scaleY: 1,
          scaleSpeed: Math.random() * 0.1 + 0.05,
          gravity: 0.22,
          drag: 0.956,
          opacity: 1,
          life: 0,
          maxLife: Math.min(durationMs, 3200),
        });
      }
    }

    let lastCannonVolley = -1;
    let lastFireworkIndex = -1;
    let lastTime = performance.now();

    const render = (now) => {
      const elapsed = now - startTime;
      const dt = Math.min((now - lastTime) / 16.66, 2.5);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // --- CONTINUOUS MODE SPAWNERS ---
      if (elapsed < durationMs) {
        // 2. FALLING MODE: Continuous rain-style effect for as long as duration is set
        if (mode === "Falling") {
          const spawnRate = Math.round(2.5 * intensityScale);
          for (let i = 0; i < spawnRate; i++) {
            let spawnX = Math.random() * width;
            if (position === "Center") {
              spawnX = width * 0.25 + Math.random() * (width * 0.5);
            } else if (position === "Left side") {
              spawnX = Math.random() * (width * 0.45);
            } else if (position === "Right side") {
              spawnX = width * 0.55 + Math.random() * (width * 0.45);
            }
            particles.push({
              x: spawnX,
              y: -12,
              vx: (Math.random() - 0.5) * 1.5,
              vy: Math.random() * 1.8 + 1.6,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: Math.random() * 5 + 7,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.18,
              scaleX: 1,
              scaleY: 1,
              scaleSpeed: Math.random() * 0.08 + 0.04,
              gravity: 0.038,
              drag: 0.994,
              opacity: 1,
              swayAmp: Math.random() * 1.8 + 0.8,
              swaySpeed: Math.random() * 0.035 + 0.018,
              phase: Math.random() * Math.PI * 2,
              life: 0,
              maxLife: 2800,
            });
          }
        }

        // 3. FOUNTAIN MODE: Pieces rise up first, then fall back down, like water from a fountain
        if (mode === "Fountain" && elapsed < durationMs * 0.8) {
          const spawnRate = Math.round(3.5 * intensityScale);
          let fx = width * 0.5;
          if (position === "Left side") fx = width * 0.28;
          else if (position === "Right side") fx = width * 0.72;
          else if (position === "Around button/element") fx = width * 0.5;

          for (let i = 0; i < spawnRate; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.58;
            const speed = (Math.random() * 6 + 12.5) * (0.85 + intensityScale * 0.15);
            particles.push({
              x: fx + (Math.random() - 0.5) * 30,
              y: position === "Around button/element" ? height * 0.50 : height * 0.98,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: Math.random() * 6 + 7,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.32,
              scaleX: 1,
              scaleY: 1,
              scaleSpeed: Math.random() * 0.08 + 0.04,
              gravity: 0.34,
              drag: 0.984,
              opacity: 1,
              life: 0,
              maxLife: 2600,
            });
          }
        }

        // 4. CANNON MODE: Fires from one side or corner across the screen
        if (mode === "Cannon" && elapsed < durationMs * 0.75) {
          const cannonVolleyInterval = 480;
          const currentVolley = Math.floor(elapsed / cannonVolleyInterval);
          if (currentVolley > lastCannonVolley) {
            lastCannonVolley = currentVolley;
            const volleyCount = Math.round(22 * intensityScale);

            // Left Cannon (blasts towards upper-right)
            if (position !== "Right side") {
              const originX = position === "Around button/element" ? width * 0.45 : 0;
              const originY = position === "Around button/element" ? height * 0.45 : height * 0.94;
              for (let i = 0; i < volleyCount; i++) {
                const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.42;
                const speed = (Math.random() * 6.5 + 12.5) * (0.85 + intensityScale * 0.15);
                particles.push({
                  x: originX,
                  y: originY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  size: Math.random() * 6 + 7,
                  rotation: Math.random() * Math.PI * 2,
                  rotSpeed: (Math.random() - 0.5) * 0.32,
                  scaleX: 1,
                  scaleY: 1,
                  scaleSpeed: 0.08,
                  gravity: 0.28,
                  drag: 0.978,
                  opacity: 1,
                  life: 0,
                  maxLife: 2600,
                });
              }
            }

            // Right Cannon (blasts towards upper-left)
            if (position !== "Left side") {
              const originX = position === "Around button/element" ? width * 0.55 : width;
              const originY = position === "Around button/element" ? height * 0.45 : height * 0.94;
              for (let i = 0; i < volleyCount; i++) {
                const angle = (-3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.42;
                const speed = (Math.random() * 6.5 + 12.5) * (0.85 + intensityScale * 0.15);
                particles.push({
                  x: originX,
                  y: originY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  size: Math.random() * 6 + 7,
                  rotation: Math.random() * Math.PI * 2,
                  rotSpeed: (Math.random() - 0.5) * 0.32,
                  scaleX: 1,
                  scaleY: 1,
                  scaleSpeed: 0.08,
                  gravity: 0.28,
                  drag: 0.978,
                  opacity: 1,
                  life: 0,
                  maxLife: 2600,
                });
              }
            }
          }
        }

        // 5. FIREWORKS MODE: Multiple smaller bursts in sequence across the screen
        if (mode === "Fireworks" && elapsed < durationMs) {
          const fireworkInterval = 420;
          const currentFirework = Math.floor(elapsed / fireworkInterval);
          if (currentFirework > lastFireworkIndex) {
            lastFireworkIndex = currentFirework;

            const fireworkPositions = [
              { x: width * 0.28, y: height * 0.26 },
              { x: width * 0.72, y: height * 0.22 },
              { x: width * 0.50, y: height * 0.36 },
              { x: width * 0.22, y: height * 0.44 },
              { x: width * 0.78, y: height * 0.40 },
              { x: width * 0.38, y: height * 0.20 },
              { x: width * 0.62, y: height * 0.46 },
              { x: width * 0.30, y: height * 0.50 },
            ];
            const targetPos = fireworkPositions[currentFirework % fireworkPositions.length];
            const burstParticles = Math.round(30 * intensityScale);

            for (let p = 0; p < burstParticles; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (Math.random() * 5.2 + 2.8) * (0.85 + intensityScale * 0.15);
              particles.push({
                x: targetPos.x,
                y: targetPos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[p % colors.length],
                size: Math.random() * 5 + 6,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.35,
                scaleX: 1,
                scaleY: 1,
                scaleSpeed: 0.09,
                gravity: 0.12,
                drag: 0.942,
                opacity: 1,
                twinkle: true,
                life: 0,
                maxLife: 1550,
              });
            }
          }
        }
      }

      // --- PARTICLE SIMULATION & RENDERING ---
      particles = particles.filter((p) => {
        p.life += dt * 16.66;
        if (p.life >= p.maxLife) return false;

        p.vx *= Math.pow(p.drag, dt);
        p.vy *= Math.pow(p.drag, dt);
        p.vy += p.gravity * dt;

        if (p.swayAmp) {
          p.x += Math.sin(p.life * p.swaySpeed + p.phase) * p.swayAmp + p.vx * dt;
        } else {
          p.x += p.vx * dt;
        }
        p.y += p.vy * dt;

        p.rotation += p.rotSpeed * dt;
        p.scaleX = Math.cos(p.life * p.scaleSpeed);

        const remainingRatio = 1 - p.life / p.maxLife;
        p.opacity = Math.max(0, Math.min(1, remainingRatio * 1.4));
        if (p.twinkle) {
          p.opacity *= 0.7 + Math.sin(p.life * 0.15) * 0.3;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scaleX, p.scaleY);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (imgRef.current && shape === "custom") {
          ctx.drawImage(imgRef.current, -p.size / 2, -p.size / 2, p.size, p.size);
        } else if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "star") {
          drawCanvasStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
        } else if (shape === "heart") {
          drawCanvasHeart(ctx, 0, 0, p.size);
        } else if (shape === "triangle") {
          drawCanvasTriangle(ctx, 0, 0, p.size);
        } else {
          ctx.font = `${Math.round(p.size)}px sans-serif`;
          ctx.fillText("🎉", -p.size / 2, p.size / 2);
        }

        ctx.restore();
        return true;
      });

      if (elapsed < durationMs + 2500 || particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [triggerKey, mode, position, duration, intensity, shape, colors, customImage]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}

// Canvas helper: 5-point star
function drawCanvasStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
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

// Canvas helper: Heart
function drawCanvasHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + topCurveHeight);
  ctx.bezierCurveTo(
    cx,
    cy,
    cx - size / 2,
    cy,
    cx - size / 2,
    cy + topCurveHeight
  );
  ctx.bezierCurveTo(
    cx - size / 2,
    cy + (size + topCurveHeight) / 2,
    cx,
    cy + (size + topCurveHeight) / 1.5,
    cx,
    cy + size
  );
  ctx.bezierCurveTo(
    cx,
    cy + (size + topCurveHeight) / 1.5,
    cx + size / 2,
    cy + (size + topCurveHeight) / 2,
    cx + size / 2,
    cy + topCurveHeight
  );
  ctx.bezierCurveTo(
    cx + size / 2,
    cy,
    cx,
    cy,
    cx,
    cy + topCurveHeight
  );
  ctx.closePath();
  ctx.fill();
}

// Canvas helper: Triangle
function drawCanvasTriangle(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size / 2);
  ctx.lineTo(cx + size / 2, cy + size / 2);
  ctx.lineTo(cx - size / 2, cy + size / 2);
  ctx.closePath();
  ctx.fill();
}
