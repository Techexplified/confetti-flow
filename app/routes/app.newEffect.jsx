import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate, useSubmit, useNavigation, redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getStorefrontThemeColors } from "../services/theme.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  let effect = null;
  if (id) {
    effect = await prisma.confettiEffect.findFirst({
      where: { id, shop: session.shop },
    });
    // Premade effects cannot be edited
    let isPreMade = Boolean(effect?.preMade);
    if (effect && effect.preMade === undefined) {
      try {
        const raw = await prisma.$queryRawUnsafe(
          'SELECT "preMade" FROM "ConfettiEffect" WHERE id = $1',
          id
        );
        if (raw && raw[0]) {
          isPreMade = Boolean(raw[0].preMade);
        }
      } catch (e) {}
    }
    if (effect && effect.customSound === undefined) {
      try {
        const rawSound = await prisma.$queryRawUnsafe(
          'SELECT "customSound" FROM "ConfettiEffect" WHERE id = $1',
          id
        );
        if (rawSound && rawSound[0]) {
          effect.customSound = rawSound[0].customSound;
        }
      } catch (e) {}
    }
    if (effect && isPreMade) {
      const cleanParams = new URLSearchParams(url.searchParams);
      cleanParams.delete("id");
      const query = cleanParams.toString();
      throw redirect(`/app${query ? `?${query}` : ""}`);
    }
  }

  const themeBrand = await getStorefrontThemeColors({
    shop: session.shop,
    accessToken: session.accessToken,
  });

  return { shop: session.shop, effect, themeBrand };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const effectId = formData.get("effectId")?.toString() || formData.get("id")?.toString();
  const name = (formData.get("name") || "Untitled celebration").toString();
  const status = (formData.get("status") || "draft").toString();
  const triggerEvent = (formData.get("triggerEvent") || "Order created").toString();

  let triggerConditions = {};
  try {
    triggerConditions = JSON.parse(formData.get("triggerConditions")?.toString() || "{}");
  } catch (e) {
    triggerConditions = {};
  }

  const shape = (formData.get("shape") || "circle").toString();
  const customImage = formData.get("customImage") ? formData.get("customImage").toString() : null;
  const useBrandColor = formData.get("useBrandColor") === "true";

  let colors = [];
  try {
    colors = JSON.parse(formData.get("colors")?.toString() || "[]");
  } catch (e) {
    colors = ["#e11d48", "#f472b6", "#fbbf24", "#10b981", "#3b82f6", "#8b5cf6"];
  }

  const mode = (formData.get("mode") || "Burst").toString();
  const position = (formData.get("position") || "Full screen").toString();
  const duration = parseInt(formData.get("duration")?.toString() || "3", 10);
  const intensity = parseInt(formData.get("intensity")?.toString() || "2", 10);
  const soundEnabled = formData.get("soundEnabled") === "true";
  const soundType = (formData.get("soundType") || "Fairy magic sparkle").toString();
  const customSound = formData.get("customSound") ? formData.get("customSound").toString() : null;

  const safePayload = {
    name,
    status,
    triggerEvent,
    triggerConditions,
    shape,
    customImage,
    useBrandColor,
    colors,
    mode,
    position,
    duration,
    intensity,
    soundEnabled,
    soundType,
  };

  let targetId = effectId;
  if (effectId) {
    await prisma.confettiEffect.updateMany({
      where: { id: effectId, shop: session.shop },
      data: safePayload,
    });
  } else {
    const created = await prisma.confettiEffect.create({
      data: {
        shop: session.shop,
        ...safePayload,
      },
    });
    targetId = created.id;
  }

  // Update customSound directly in PostgreSQL to avoid Prisma Client DMMF validation error
  if (targetId) {
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "ConfettiEffect" SET "customSound" = $1 WHERE id = $2',
        customSound,
        targetId
      );
    } catch (sqlErr) {
      console.error("[ConfettiFlow] Failed to set customSound via SQL:", sqlErr);
    }
  }

  // Strip `id` (and `effectId`) from the redirect so it doesn't appear on the dashboard URL
  const url = new URL(request.url);
  url.searchParams.delete("id");
  url.searchParams.delete("effectId");
  const cleanParams = url.searchParams.toString();
  return redirect(`/app${cleanParams ? `?${cleanParams}` : ""}`);
};

// Sleek animated SVG spinner for button loading states
function ButtonSpinner({ className = "w-4 h-4 text-current" }) {
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

export default function NewEffect() {
  const loaderData = useLoaderData();
  const effect = loaderData?.effect || null;
  const themeBrand = loaderData?.themeBrand;
  const isEditing = Boolean(effect?.id);

  // Dynamic theme brand colors
  const detectedBrandColors =
    themeBrand?.brandColors && themeBrand.brandColors.length > 0
      ? themeBrand.brandColors
      : ["#008060", "#004c3f", "#479ccf", "#0099e6", "#002aff"];
  const brandPrimaryColor = themeBrand?.primaryColor || detectedBrandColors[0];
  const themeName = themeBrand?.themeName || "Store theme";

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const dashboardUrl = `/app`;

  // Form State matching the wireframe or existing effect
  const [effectName, setEffectName] = useState(effect?.name || "");
  const [triggerEvent, setTriggerEvent] = useState(effect?.triggerEvent || "Order created");

  // Trigger Conditions
  const tc =
    typeof effect?.triggerConditions === "object" && effect?.triggerConditions !== null
      ? effect.triggerConditions
      : {};

  const [productTagOp, setProductTagOp] = useState(tc.productTagOp || "Contains");
  const [productTagVal, setProductTagVal] = useState(tc.productTagVal || "");

  const [discountOp, setDiscountOp] = useState(tc.discountOp || "Contains");
  const [discountVal, setDiscountVal] = useState(tc.discountVal || "");

  const [orderValueMin, setOrderValueMin] = useState(tc.orderValueMin || "");
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(tc.firstTimeBuyer || "Yes (First-time buyers only)");
  const [quantityMin, setQuantityMin] = useState(tc.quantityMin || "");
  const [loyaltyMilestone, setLoyaltyMilestone] = useState(tc.loyaltyMilestone || "");

  // Shape state: 'circle' | 'star' | 'heart' | 'triangle' | 'text' | 'custom'
  const [selectedShape, setSelectedShape] = useState(effect?.shape || "circle");
  const [customImage, setCustomImage] = useState(effect?.customImage || null);

  // Colors state
  const [useBrandColor, setUseBrandColor] = useState(
    effect?.useBrandColor !== undefined ? effect.useBrandColor : true
  );
  const [customColors, setCustomColors] = useState(
    Array.isArray(effect?.colors) && effect.colors.length > 0
      ? effect.colors
      : [
          "#e11d48", // Rose / Crimson
          "#fbbf24", // Yellow / Gold
          "#6366f1", // Indigo / Purple
        ]
  );

  // Mode & Position state
  const [mode, setMode] = useState(effect?.mode || "Burst");
  const [position, setPosition] = useState(effect?.position || "Full screen");

  // Duration & Intensity state
  const [duration, setDuration] = useState(Number(effect?.duration) || 3);
  const [intensity, setIntensity] = useState(Number(effect?.intensity) || 2); // 1: Low, 2: Medium, 3: High, 4: Extreme

  // Sound pairing state
  const [soundEnabled, setSoundEnabled] = useState(Boolean(effect?.soundEnabled));
  const [soundType, setSoundType] = useState(effect?.soundType || "Fairy magic sparkle");
  const [customSound, setCustomSound] = useState(effect?.customSound || null);
  const [customSoundName, setCustomSoundName] = useState(effect?.customSound ? "Custom sound active" : "");
  const [customSoundDuration, setCustomSoundDuration] = useState(null);
  const [soundError, setSoundError] = useState("");

  // Sync state whenever the loaded effect changes (handles navigating between edit ↔ new)
  useEffect(() => {
    if (effect) {
      // EDIT mode: populate all fields from the existing effect
      setEffectName(effect.name || "");
      setTriggerEvent(effect.triggerEvent || "Order created");
      const c =
        typeof effect.triggerConditions === "object" && effect.triggerConditions !== null
          ? effect.triggerConditions
          : {};
      setProductTagOp(c.productTagOp || "Contains");
      setProductTagVal(c.productTagVal || "");
      setDiscountOp(c.discountOp || "Contains");
      setDiscountVal(c.discountVal || "");
      setOrderValueMin(c.orderValueMin || "");
      setFirstTimeBuyer(c.firstTimeBuyer || "Yes (First-time buyers only)");
      setQuantityMin(c.quantityMin || "");
      setLoyaltyMilestone(c.loyaltyMilestone || "");
      setSelectedShape(effect.shape || "circle");
      setCustomImage(effect.customImage || null);
      setUseBrandColor(effect.useBrandColor !== undefined ? effect.useBrandColor : true);
      if (Array.isArray(effect.colors) && effect.colors.length > 0) {
        setCustomColors(effect.colors);
      }
      setMode(effect.mode || "Burst");
      setPosition(effect.position || "Full screen");
      setDuration(Number(effect.duration) || 3);
      setIntensity(Number(effect.intensity) || 2);
      setSoundEnabled(Boolean(effect.soundEnabled));
      setSoundType(effect.soundType || "Fairy magic sparkle");
      setCustomSound(effect.customSound || null);
      setCustomSoundName(effect.customSound ? "Custom celebration sound" : "");
      setCustomSoundDuration(null);
      setSoundError("");
    } else {
      // CREATE mode: reset all fields back to fresh defaults
      setEffectName("");
      setTriggerEvent("Order created");
      setProductTagOp("Contains");
      setProductTagVal("");
      setDiscountOp("Contains");
      setDiscountVal("");
      setOrderValueMin("");
      setFirstTimeBuyer("Yes (First-time buyers only)");
      setQuantityMin("");
      setLoyaltyMilestone("");
      setSelectedShape("circle");
      setCustomImage(null);
      setUseBrandColor(true);
      setCustomColors(["#e11d48", "#fbbf24", "#6366f1"]);
      setMode("Burst");
      setPosition("Full screen");
      setDuration(3);
      setIntensity(2);
      setSoundEnabled(false);
      setSoundType("Fairy magic sparkle");
      setCustomSound(null);
      setCustomSoundName("");
      setCustomSoundDuration(null);
      setSoundError("");
    }
  }, [effect]);

  // Preview Device: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState("desktop");

  // Live burst trigger state
  const [burstCount, setBurstCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState(null); // 'draft' | 'published' | null
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

  // Available screen positions tailored per confetti mode
  const MODE_POSITIONS = {
    Burst: ["Full screen", "Center", "Top", "Left side", "Right side"],
    Falling: ["Full screen", "Center", "Top", "Left side", "Right side"],
    Fountain: ["Full screen", "Bottom", "Left side", "Right side"],
    Cannon: ["Full screen", "Left side", "Right side"],
    Fireworks: ["Full screen"],
  };

  // Ensure selected position is always valid for the active mode
  useEffect(() => {
    const validPositions = MODE_POSITIONS[mode] || ["Full screen"];
    if (!validPositions.includes(position)) {
      setPosition(validPositions[0]);
    }
  }, [mode, position]);

  const triggerBurst = () => {
    setBurstCount((prev) => prev + 1);
    if (soundEnabled) {
      playSound(soundType, customSound);
    }
  };

  const handleCustomColorAdd = (e) => {
    const newColor = e.target.value;
    if (newColor && customColors.length < 5) {
      setCustomColors((prev) => [...prev, newColor]);
      setBurstCount((prev) => prev + 1);
    }
  };

  const handleCustomColorChange = (index, newColor) => {
    if (!newColor) return;
    setCustomColors((prev) => {
      const updated = [...prev];
      updated[index] = newColor;
      return updated;
    });
    setBurstCount((prev) => prev + 1);
  };

  const handleCustomColorRemove = (index, e) => {
    e.stopPropagation();
    if (customColors.length > 1) {
      setCustomColors((prev) => prev.filter((_, i) => i !== index));
      setBurstCount((prev) => prev + 1);
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

  const handleSoundUpload = (e) => {
    setSoundError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/m4a", "audio/aac"];
    const validExts = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
      setSoundError("Invalid audio format. Please upload an MP3, WAV, OGG, or M4A file.");
      return;
    }

    // 2. Validate File Size (Max 250 KB)
    const MAX_SIZE_BYTES = 250 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setSoundError(`Sound file is too large (${(file.size / 1024).toFixed(1)} KB). Maximum allowed size is 250 KB to ensure instantaneous playback without delay.`);
      return;
    }

    // 3. Validate Audio Duration asynchronously (Max 5.0 seconds)
    const audioObj = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audioObj.src = objectUrl;

    audioObj.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const durationSec = audioObj.duration;
      if (durationSec > 5.5) {
        setSoundError(`Sound is too long (${durationSec.toFixed(1)}s). Celebration sound must be 5 seconds or less.`);
        return;
      }

      // 4. File passed all checks -> Read as Base64 data URL
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64Data = loadEvt.target?.result;
        setCustomSound(base64Data);
        setCustomSoundName(file.name);
        setCustomSoundDuration(durationSec.toFixed(1));
        setSoundType("Custom sound");
        setSoundError("");
        if (soundEnabled) {
          playSound("Custom sound", base64Data);
        }
      };
      reader.readAsDataURL(file);
    };

    audioObj.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setSoundError("Could not decode audio file. Please check that the file is not corrupted.");
    };
  };

  const handleRemoveCustomSound = () => {
    setCustomSound(null);
    setCustomSoundName("");
    setCustomSoundDuration(null);
    setSoundError("");
    setSoundType("Fairy magic sparkle");
  };

  const submit = useSubmit();
  const navigation = useNavigation();

  // Only consider submitting if user explicitly initiated save/publish (never during link navigations)
  const isPublishLoading =
    savingAction === "published" &&
    (isSaving || navigation.state === "submitting" || navigation.state === "loading");
  const isDraftLoading =
    savingAction === "draft" &&
    (isSaving || navigation.state === "submitting" || navigation.state === "loading");
  const isSubmitting = isPublishLoading || isDraftLoading;

  // Reset saving state if navigation finishes or errors back to idle
  useEffect(() => {
    if (navigation.state === "idle" && !navigation.formData) {
      setIsSaving(false);
      setSavingAction(null);
    }
  }, [navigation.state, navigation.formData]);

  const handleSave = (status = "draft") => {
    setSavingAction(status);
    setIsSaving(true);
    setToastMessage(
      status === "published"
        ? isEditing
          ? "🎉 Effect updated & published!"
          : "🎉 Effect published successfully!"
        : isEditing
        ? "Effect changes saved as draft!"
        : "Effect saved as draft!"
    );

    const payload = {
      ...(effect?.id ? { effectId: effect.id, id: effect.id } : {}),
      name: effectName.trim() || "Untitled celebration",
      status: status === "published" ? "active" : "draft",
      triggerEvent,
      triggerConditions: JSON.stringify({
        productTagOp,
        productTagVal,
        discountOp,
        discountVal,
        orderValueMin,
        firstTimeBuyer,
        quantityMin,
        loyaltyMilestone,
      }),
      shape: selectedShape,
      customImage: customImage || "",
      useBrandColor: String(useBrandColor),
      colors: JSON.stringify(useBrandColor ? detectedBrandColors : customColors),
      mode,
      position,
      duration: String(duration),
      intensity: String(intensity),
      soundEnabled: String(soundEnabled),
      soundType,
      customSound: customSound || "",
    };

    submit(payload, { method: "post" });
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
            {isEditing ? "Edit effect" : "Create new effect"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            {isEditing
              ? `Update settings and customize your "${effect?.name || "celebration"}" effect.`
              : "Build it from scratch, every setting below is yours to customise."}
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
                  {/* <option value="Order created">Order created</option> */}
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
                onClick={() => {
                  setUseBrandColor(!useBrandColor);
                  setBurstCount((prev) => prev + 1);
                }}
                className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-slate-200/80 shadow-xs flex items-center justify-center shrink-0 transition-colors duration-200"
                      style={{ backgroundColor: brandPrimaryColor }}
                    ></div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Use my store&apos;s brand colors</span>
                        {useBrandColor && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {themeName}
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                        {useBrandColor
                          ? `Confetti matches your storefront palette (${themeName})`
                          : "Uncheck to configure custom colors below"}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={useBrandColor}
                    onChange={(e) => {
                      setUseBrandColor(e.target.checked);
                      setBurstCount((prev) => prev + 1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer accent-[#7c3aed] shrink-0"
                  />
                </div>

                {/* Detected Theme Palette Strip when active */}
                {useBrandColor && (
                  <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
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

            {/* Field: Custom Colors */}
            <div className={`space-y-2.5 pt-1 transition-opacity ${useBrandColor ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Custom colors
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {customColors.length}/5 colors
                  </span>
                </div>
                {useBrandColor && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Disabled while using brand colors)
                  </span>
                )}
              </div>
                {/* {customColors.length >= 5 ? (
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Max 5 colors reached
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Add up to 5 colors
                  </span>
                )} */}

              {/* Swatches and Add button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {customColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="relative group"
                    title={`Color ${idx + 1}: ${color} (Click to edit)`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-xs border-2 border-white ring-1 ring-slate-300 transition-all group-hover:scale-110 group-hover:ring-purple-400 cursor-pointer flex items-center justify-center overflow-hidden relative"
                      style={{ backgroundColor: color }}
                    >
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleCustomColorChange(idx, e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        title="Click to edit color"
                      />
                    </div>

                    {/* Delete color button (shown on hover if > 1 color) */}
                    {customColors.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCustomColorRemove(idx, e)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-800 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer leading-none"
                        title="Remove color"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Custom Color Button (Active if < 5, max badge if 5) */}
                {customColors.length < 5 ? (
                  <label
                    title={`Add custom color (${customColors.length}/5)`}
                    className="relative w-8 h-8 rounded-full border-2 border-dashed border-purple-400 text-purple-600 hover:bg-purple-50 hover:border-purple-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-all hover:scale-105"
                  >
                    <span className="leading-none select-none">+</span>
                    <input
                      key={customColors.length}
                      type="color"
                      defaultValue="#10b981"
                      onChange={handleCustomColorAdd}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                ) : (
                  <div
                    title="Maximum of 5 custom colors reached"
                    className="h-8 px-2.5 rounded-full border border-slate-200 bg-slate-100/80 text-slate-400 flex items-center justify-center text-[11px] font-semibold select-none cursor-not-allowed"
                  >
                    5/5 Max
                  </div>
                )}
              </div>

              {/* Interactive tip */}
              <p className="text-[11px] text-slate-400 leading-tight">
                Click any circle to edit &bull; Hover to delete &bull; Up to 5 colors
              </p>

              {/* Quick Palette Presets */}
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
                {[
                  { name: "Rainbow", colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"] },
                  { name: "Pastel", colors: ["#fb7185", "#f472b6", "#c084fc", "#fde047", "#67e8f9"] },
                  { name: "Gold Glow", colors: ["#d97706", "#f59e0b", "#fbbf24", "#fef08a", "#cbd5e1"] },
                  { name: "Ocean Breeze", colors: ["#0284c7", "#06b6d4", "#14b8a6", "#3b82f6", "#6366f1"] },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCustomColors(preset.colors);
                      setBurstCount((prev) => prev + 1);
                    }}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100/90 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title={`Apply ${preset.name} palette (5 colors)`}
                  >
                    <div className="flex -space-x-1">
                      {preset.colors.slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full border border-white"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span>{preset.name}</span>
                  </button>
                ))}
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
                      const newMode = e.target.value;
                      setMode(newMode);
                      const validPositions = MODE_POSITIONS[newMode] || ["Full screen"];
                      if (!validPositions.includes(position)) {
                        setPosition(validPositions[0]);
                      }
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
                    {(MODE_POSITIONS[mode] || ["Full screen"]).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
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
            <div className="space-y-2.5 pt-1">
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
                      if (next) playSound(soundType, customSound);
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

              {/* Sound Select Box & Test Button */}
              <div className={`transition-all duration-200 space-y-2.5 ${!soundEnabled ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={customSound ? "Custom sound" : soundType}
                      disabled={!soundEnabled || Boolean(customSound)}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setSoundType(nextType);
                        if (soundEnabled) playSound(nextType, customSound);
                      }}
                      className={`w-full appearance-none px-3.5 py-2.5 rounded-xl text-xs font-medium pr-8 shadow-xs transition-all ${
                        !soundEnabled || customSound
                          ? "bg-slate-100/90 border border-slate-300/80 text-slate-400 cursor-not-allowed select-none"
                          : "bg-white border-2 border-[#2563eb] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer"
                      }`}
                      title={
                        !soundEnabled
                          ? "Sound pairing is turned off. Toggle switch above to enable sound."
                          : customSound
                          ? "Sound dropdown is disabled because a custom sound is uploaded. Remove the custom sound below to re-enable presets."
                          : ""
                      }
                    >
                      {customSound && (
                        <option value="Custom sound">✨ Custom uploaded sound (active)</option>
                      )}
                      <option value="Fairy magic sparkle">Fairy magic sparkle</option>
                      <option value="Magic wand sparkle">Magic wand sparkle</option>
                      <option value="Magic sparkle touch">Magic sparkle touch</option>
                      <option value="Magic sparkle poof hit">Magic sparkle poof hit</option>
                      <option value="Fairy sparkle whoosh">Fairy sparkle whoosh</option>
                      <option value="Sparkling fairy glow">Sparkling fairy glow</option>
                      <option value="Sparkle hybrid transition">Sparkle hybrid transition</option>
                      <option value="Magic sparkle whoosh">Magic sparkle whoosh</option>
                      <option value="Magic notification ring">Magic notification ring</option>
                      <option value="Fantasy game success notification">Fantasy game success notification</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                      {!soundEnabled || customSound ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" title="Disabled">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Test Sound Button */}
                  <button
                    type="button"
                    disabled={!soundEnabled}
                    onClick={() => soundEnabled && playSound(soundType, customSound)}
                    title={!soundEnabled ? "Enable sound pairing to test sounds" : "Click to test this sound"}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      !soundEnabled
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                        : "bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                    }`}
                  >
                    <span>🔊</span>
                    <span>Test sound</span>
                  </button>
                </div>

                {/* Upload Custom Sound Box */}
                <div
                  className={`border rounded-2xl p-3 flex flex-col gap-2.5 transition-all ${
                    !soundEnabled
                      ? "border-slate-200 bg-slate-100/60 pointer-events-none select-none cursor-not-allowed"
                      : "border-purple-200/90 bg-purple-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          !soundEnabled
                            ? "bg-slate-200 text-slate-400"
                            : "bg-purple-100 text-[#7c3aed]"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs font-bold truncate ${!soundEnabled ? "text-slate-400" : "text-slate-800"}`}>
                          {customSound ? (customSoundName || "Custom celebration sound") : "Upload your own sound"}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                          {!soundEnabled
                            ? "Sound pairing is turned off"
                            : customSound
                            ? `${customSoundDuration ? `${customSoundDuration}s • ` : ""}Custom audio ready`
                            : "MP3, WAV, or OGG • Max 250 KB • ≤ 5s"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {customSound && (
                        <button
                          type="button"
                          disabled={!soundEnabled}
                          onClick={() => soundEnabled && playSound("Custom sound", customSound)}
                          title="Preview custom sound"
                          className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200/80 text-purple-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>🔊</span>
                          <span>Preview</span>
                        </button>
                      )}
                      <label
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors shrink-0 ${
                          !soundEnabled
                            ? "border border-slate-300 text-slate-400 bg-slate-200/50 cursor-not-allowed pointer-events-none"
                            : "border border-[#7c3aed] text-[#7c3aed] hover:bg-purple-100/60 cursor-pointer"
                        }`}
                      >
                        <span>{customSound ? "Replace" : "Upload sound"}</span>
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                          disabled={!soundEnabled}
                          onChange={handleSoundUpload}
                          className="hidden"
                        />
                      </label>
                      {customSound && (
                        <button
                          type="button"
                          disabled={!soundEnabled}
                          onClick={handleRemoveCustomSound}
                          title="Remove custom sound"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sound Validation Error Alert */}
                  {soundError && soundEnabled && (
                    <div className="bg-red-50 border border-red-200/90 rounded-xl px-2.5 py-2 flex items-start gap-2 text-red-700 text-[11px] font-medium leading-tight">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{soundError}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  {!soundEnabled
                    ? "Turn on Sound pairing above to enable sounds."
                    : customSound
                    ? "Preset sound dropdown is locked while your custom sound is active. Click '✕' to remove it and re-enable presets."
                    : "Click 'Test sound' or preview the effect to hear the celebration audio"}
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE PREVIEW + ACTION BUTTONS (7 cols)    */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-6 lg:self-start bg-white border border-slate-200/90 rounded-[24px] p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
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
                      colors={useBrandColor ? detectedBrandColors : customColors}
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
                disabled={isSubmitting}
                className="bg-[#f3e8ff] hover:bg-[#ebd5ff] active:scale-[0.98] text-[#6d28d9] font-bold text-[13.5px] px-4 py-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>▶ Preview effect</span>
                <span>✨</span>
              </button>

              {/* Button 2: Save as draft */}
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={isSubmitting}
                className={`font-semibold text-[13.5px] px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 select-none border ${
                  isDraftLoading
                    ? "bg-slate-100 border-slate-300 text-slate-700 cursor-wait shadow-inner"
                    : isSubmitting
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    : "bg-white hover:bg-slate-50 active:scale-[0.98] border-slate-300 text-slate-700 cursor-pointer shadow-sm hover:shadow"
                }`}
              >
                {isDraftLoading ? (
                  <>
                    <ButtonSpinner className="w-4 h-4 text-slate-600" />
                    <span>{isEditing ? "Saving changes..." : "Saving draft..."}</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 text-slate-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>
                      {isEditing ? "Save draft changes" : "Save as draft"}
                    </span>
                  </>
                )}
              </button>

              {/* Button 3: Publish effect 🚀 */}
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={isSubmitting}
                className={`font-bold text-[13.5px] px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 select-none ${
                  isPublishLoading
                    ? "bg-[#3f2485] text-white cursor-wait shadow-lg ring-2 ring-purple-400/50"
                    : isSubmitting
                    ? "bg-[#4d319e]/50 text-white/60 cursor-not-allowed opacity-50"
                    : "bg-[#4d319e] hover:bg-[#3f2485] active:scale-[0.98] text-white cursor-pointer shadow-sm hover:shadow-md"
                }`}
                style={{
                  boxShadow: isPublishLoading
                    ? "0 4px 18px rgba(77, 49, 158, 0.45)"
                    : "0 4px 14px rgba(77, 49, 158, 0.25)",
                }}
              >
                {isPublishLoading ? (
                  <>
                    <ButtonSpinner className="w-4 h-4 text-white" />
                    <span>
                      {isEditing ? "Updating & publishing..." : "Publishing effect..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {isEditing
                        ? "Update & publish effect"
                        : "Publish effect"}
                    </span>
                    <span className="text-base leading-none">🚀</span>
                  </>
                )}
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

// ---------------------------------------------------------------------------
// Sound Engine — pre-decoded AudioBuffer for zero-latency playback
// ---------------------------------------------------------------------------
const SOUND_FILES = {
  "Fairy magic sparkle":             "/soundEffects/mixkit-fairy-magic-sparkle-871.mp3",
  "Magic wand sparkle":              "/soundEffects/mixkit-magic-wand-sparkle-3062.mp3",
  "Magic sparkle touch":             "/soundEffects/mixkit-magic-sparkle-touch-3083.mp3",
  "Magic sparkle poof hit":          "/soundEffects/mixkit-magic-sparkle-poof-hit-3082.mp3",
  "Fairy sparkle whoosh":            "/soundEffects/mixkit-fairy-sparkle-whoosh-869.mp3",
  "Sparkling fairy glow":            "/soundEffects/mixkit-sparkling-fairy-glow-870.mp3",
  "Sparkle hybrid transition":       "/soundEffects/mixkit-sparkle-hybrid-transition-3060.mp3",
  "Magic sparkle whoosh":            "/soundEffects/mixkit-magic-sparkle-whoosh-2350.mp3",
  "Magic notification ring":         "/soundEffects/mixkit-magic-notification-ring-2344.mp3",
  "Fantasy game success notification": "/soundEffects/mixkit-fantasy-game-success-notification-270.mp3",
};

let _adminAudioCtx = null;
const _audioBufferCache = {};
let _preloadStarted = false;

function getAdminAudioContext() {
  if (typeof window === "undefined") return null;
  try {
    if (!_adminAudioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      _adminAudioCtx = new AudioContextClass();
    }
    if (_adminAudioCtx.state === "suspended") {
      _adminAudioCtx.resume().catch(() => {});
    }
    return _adminAudioCtx;
  } catch (e) {
    console.warn("[ConfettiFlow] AudioContext init error:", e);
    return null;
  }
}

// Pre-fetch + decode ALL sound files into AudioBuffers so playback is instant
function preloadAllSounds() {
  if (typeof window === "undefined" || _preloadStarted) return;
  _preloadStarted = true;
  const ctx = getAdminAudioContext();
  if (!ctx) return;
  Object.entries(SOUND_FILES).forEach(([name, path]) => {
    fetch(path)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buffer) => { _audioBufferCache[name] = buffer; })
      .catch(() => {}); // silent — fallback will handle missing files
  });
}

// Audio synthesizer for sound pairing
function playSound(type, customSoundData = null) {
  if (typeof window === "undefined") return;
  preloadAllSounds();
  try {
    if ((type === "Custom sound" || !SOUND_FILES[type]) && customSoundData) {
      const audio = new Audio(customSoundData);
      audio.volume = 0.85;
      audio.play().catch((err) => console.warn("[ConfettiFlow] Audio play blocked:", err));
      return;
    }

    const ctx = getAdminAudioContext();
    if (!ctx) return;

    const buffer = _audioBufferCache[type];
    if (buffer) {
      // Instant zero-latency playback from pre-decoded buffer
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(ctx.currentTime);
    } else {
      // Buffer not ready yet — fall back to HTMLAudioElement (small one-off delay)
      const path = SOUND_FILES[type];
      if (!path) return;
      const audio = new Audio(path);
      audio.volume = 0.85;
      audio.play().catch(() => {});
    }
  } catch (err) {
    console.warn("[ConfettiFlow] Audio playback error:", err);
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

  // Store all config in refs so they're always fresh but never cause re-animation
  const configRef = useRef({ mode, position, duration, intensity, shape, colors, customImage });
  useEffect(() => {
    configRef.current = { mode, position, duration, intensity, shape, colors, customImage };
  }, [mode, position, duration, intensity, shape, colors, customImage]);

  // Preload custom image if provided (non-triggering update)
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

  // ONLY re-run the animation when triggerKey changes (explicit user action)
  useEffect(() => {
    if (triggerKey === 0) return; // skip initial render

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read latest config from ref so it's always current
    const { mode, position, duration, intensity, shape, colors } = configRef.current;

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
        if (mode === "Fountain" && elapsed < durationMs * 0.88) {
          let fountainX = width * 0.5;
          let fountainY = Math.min(height - 18, height * 0.95);

          if (position === "Center") {
            fountainX = width * 0.5;
            fountainY = height * 0.58;
          } else if (position === "Around button/element") {
            fountainX = width * 0.5;
            fountainY = height * 0.55;
          } else if (position === "Top") {
            fountainX = width * 0.5;
            fountainY = height * 0.35;
          } else if (position === "Left side") {
            fountainX = width * 0.22;
            fountainY = Math.min(height - 18, height * 0.95);
          } else if (position === "Right side") {
            fountainX = width * 0.78;
            fountainY = Math.min(height - 18, height * 0.95);
          }

          const reservoirWidth = Math.min(60, width * 0.1);
          const targetApexY = Math.max(height * 0.12, Math.min(height * 0.22, fountainY * 0.25));
          const targetRise = Math.max(100, fountainY - targetApexY);
          const baseSpeed = Math.sqrt(targetRise * 1.05);

          const spawnRate = Math.round(3.2 * intensityScale);
          for (let i = 0; i < spawnRate; i++) {
            const isSplash = i === 0 && Math.random() < 0.45;

            let angle;
            if (isSplash) {
              angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            } else if (position === "Left side") {
              angle = -Math.PI / 2 + (Math.random() - 0.35) * 0.55;
            } else if (position === "Right side") {
              angle = -Math.PI / 2 + (Math.random() - 0.65) * 0.55;
            } else {
              angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
            }

            let speed;
            if (isSplash) {
              speed = (Math.random() * 4 + 4) * (0.85 + intensityScale * 0.15);
            } else {
              const speedMult = 0.76 + Math.random() * 0.36;
              speed = baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
            }

            particles.push({
              x: fountainX + (Math.random() - 0.5) * reservoirWidth,
              y: fountainY + (Math.random() - 0.5) * 6,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: isSplash ? Math.random() * 4 + 4 : Math.random() * 6 + 6,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.32,
              scaleX: 1,
              scaleY: 1,
              scaleSpeed: Math.random() * 0.08 + 0.04,
              gravity: isSplash ? 0.35 : 0.28,
              drag: isSplash ? 0.97 : 0.988,
              opacity: 1,
              life: 0,
              maxLife: 3200,
            });
          }
        }

        // 4. CANNON MODE: Fires from one side or corner across the screen
        if (mode === "Cannon" && elapsed < durationMs * 0.8) {
          const cannonVolleyInterval = 480;
          const currentVolley = Math.floor(elapsed / cannonVolleyInterval);
          if (currentVolley > lastCannonVolley) {
            lastCannonVolley = currentVolley;
            const volleyCount = Math.round(26 * intensityScale);
            const targetDist = Math.max(width * 0.65, height * 0.75);
            const baseSpeed = Math.sqrt(targetDist * 0.95);

            // Left Cannon (blasts towards upper-right)
            if (position !== "Right side") {
              const originX = position === "Around button/element" ? width * 0.42 : 0;
              const originY = position === "Around button/element" ? height * 0.52 : Math.min(height - 10, height * 0.94);
              for (let i = 0; i < volleyCount; i++) {
                const angle = -Math.PI * 0.28 + (Math.random() - 0.5) * 0.38;
                const speedMult = 0.82 + Math.random() * 0.36;
                const speed = baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
                particles.push({
                  x: originX,
                  y: originY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  size: Math.random() * 6 + 7,
                  rotation: Math.random() * Math.PI * 2,
                  rotSpeed: (Math.random() - 0.5) * 0.35,
                  scaleX: 1,
                  scaleY: 1,
                  scaleSpeed: 0.08,
                  gravity: 0.25,
                  drag: 0.982,
                  opacity: 1,
                  life: 0,
                  maxLife: 2800,
                });
              }
            }

            // Right Cannon (blasts towards upper-left)
            if (position !== "Left side") {
              const originX = position === "Around button/element" ? width * 0.58 : width;
              const originY = position === "Around button/element" ? height * 0.52 : Math.min(height - 10, height * 0.94);
              for (let i = 0; i < volleyCount; i++) {
                const angle = -Math.PI * 0.72 + (Math.random() - 0.5) * 0.38;
                const speedMult = 0.82 + Math.random() * 0.36;
                const speed = baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
                particles.push({
                  x: originX,
                  y: originY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: colors[Math.floor(Math.random() * colors.length)],
                  size: Math.random() * 6 + 7,
                  rotation: Math.random() * Math.PI * 2,
                  rotSpeed: (Math.random() - 0.5) * 0.35,
                  scaleX: 1,
                  scaleY: 1,
                  scaleSpeed: 0.08,
                  gravity: 0.25,
                  drag: 0.982,
                  opacity: 1,
                  life: 0,
                  maxLife: 2800,
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
  }, [triggerKey]);

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
