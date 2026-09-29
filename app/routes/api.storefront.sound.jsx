import fs from "fs";
import path from "path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Cache-Control": "public, max-age=86400, immutable",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const file = url.searchParams.get("file");

    if (!file) {
      return new Response("Missing file parameter", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Security: prevent directory traversal
    const safeFilename = path.basename(file);
    const soundDir = path.resolve(process.cwd(), "public", "soundEffects");
    const filePath = path.join(soundDir, safeFilename);

    let resolvedPath = filePath;
    const ext = path.extname(safeFilename).toLowerCase();
    if (!fs.existsSync(resolvedPath)) {
      const altExt = ext === ".wav" ? ".mp3" : ".wav";
      const altPath = path.join(soundDir, path.parse(safeFilename).name + altExt);
      if (fs.existsSync(altPath)) {
        resolvedPath = altPath;
      } else {
        console.warn(`[ConfettiFlow Sound API] File not found: ${filePath}`);
        return new Response("Sound file not found", {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    const stats = fs.statSync(resolvedPath);
    const fileBuffer = fs.readFileSync(resolvedPath);

    const resolvedExt = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",
    };
    const contentType = mimeTypes[resolvedExt] || "application/octet-stream";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (error) {
    console.error("[ConfettiFlow Sound API] Error serving sound:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
};
