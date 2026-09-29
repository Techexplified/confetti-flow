import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Content-Type": "application/json",
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: corsHeaders,
      });
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
        completed: Boolean(completed),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[analytics/track] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to record fire event" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// Also allow GET preflight from browsers
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });
};
