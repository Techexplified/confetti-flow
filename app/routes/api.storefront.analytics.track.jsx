/**
 * App Proxy route: /apps/confetti/analytics/track
 * Maps to: POST /api/storefront/analytics/track
 *
 * Receives fire events from the storefront extension and saves them to DB.
 * This is the app proxy version - no Shopify auth needed (CORS-open endpoint).
 */
import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Content-Type": "application/json",
};

export const loader = async ({ request }) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      // sendBeacon sometimes sends text/plain blobs
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const {
      shop = "",
      effectId = "",
      effectName = "",
      completed = true,
    } = body;

    if (!shop || !effectId) {
      return new Response(
        JSON.stringify({ error: "shop and effectId are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");

    await prisma.confettiFireEvent.create({
      data: {
        shop: cleanShop,
        effectId,
        effectName: effectName || "Unknown effect",
        completed: completed === true || completed === "true",
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[analytics/track storefront] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to record fire event" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
