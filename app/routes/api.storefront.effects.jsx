import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const shop =
      url.searchParams.get("shop") ||
      request.headers.get("x-shopify-shop-domain") ||
      "";

    if (!shop) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Shop query parameter is required.",
          effects: [],
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean up domain (strip protocol or trailing slash if passed)
    const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const effects = await prisma.confettiEffect.findMany({
      where: {
        shop: {
          contains: cleanShop,
          mode: "insensitive",
        },
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let effectsWithSound = effects;
    if (effects.length > 0 && effects[0].customSound === undefined) {
      try {
        const rawRows = await prisma.$queryRawUnsafe(
          'SELECT id, "customSound" FROM "ConfettiEffect" WHERE shop ILIKE $1 AND status = \'active\'',
          `%${cleanShop}%`
        );
        const soundMap = new Map((rawRows || []).map((r) => [r.id, r.customSound]));
        effectsWithSound = effects.map((eff) => ({
          ...eff,
          customSound: soundMap.get(eff.id) ?? null,
        }));
      } catch (e) {
        console.error("[ConfettiFlow Storefront API] Error querying customSound:", e);
      }
    }

    const sanitizedEffects = effectsWithSound.map((eff) => ({
      id: eff.id,
      name: eff.name,
      triggerEvent: eff.triggerEvent,
      triggerConditions:
        typeof eff.triggerConditions === "string"
          ? JSON.parse(eff.triggerConditions)
          : eff.triggerConditions || {},
      shape: eff.shape || "circle",
      customImage: eff.customImage || null,
      useBrandColor: eff.useBrandColor,
      colors: Array.isArray(eff.colors)
        ? eff.colors
        : typeof eff.colors === "string"
        ? JSON.parse(eff.colors || "[]")
        : ["#e11d48", "#fbbf24", "#6366f1"],
      mode: eff.mode || "Burst",
      position: eff.position || "Full screen",
      duration: eff.duration || 3,
      intensity: eff.intensity || 2,
      soundEnabled: eff.soundEnabled || false,
      soundType: eff.soundType || "Soft chime",
      customSound: eff.customSound || null,
    }));

    console.log(
      `[ConfettiFlow Storefront API] Request from shop: "${cleanShop}" | Returning ${sanitizedEffects.length} active effect(s)`
    );

    return new Response(
      JSON.stringify({
        success: true,
        shop: cleanShop,
        count: sanitizedEffects.length,
        effects: sanitizedEffects,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Storefront effects API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to load confetti effects",
        effects: [],
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
