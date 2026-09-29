export interface ThemeBrandColors {
  themeName: string;
  primaryColor: string;
  brandColors: string[]; // 5 harmonized hex colors
  rawColors: string[];
  source: "admin_api" | "storefront_css" | "storefront_html" | "default";
}

// In-memory cache for theme colors (shop -> { data, timestamp })
const THEME_CACHE = new Map<
  string,
  { data: ThemeBrandColors; timestamp: number }
>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Convert Hex color string to HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  }
  if (c.length !== 6) {
    return { h: 260, s: 70, l: 60 }; // Fallback violet
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to Hex string (#rrggbb)
 */
export function hslToHex(h: number, s: number, l: number): string {
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normL = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * normL - 1)) * normS;
  const normH = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normL - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    const hex = Math.max(0, Math.min(255, val)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Clean & normalize a hex color string
 */
export function normalizeHex(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim();
  if (!clean.startsWith("#")) return null;
  if (/^#[0-9a-fA-F]{6}$/i.test(clean)) return clean.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/i.test(clean)) {
    const chars = clean.replace("#", "").split("");
    return `#${chars[0]}${chars[0]}${chars[1]}${chars[1]}${chars[2]}${chars[2]}`.toLowerCase();
  }
  return null;
}

/**
 * Generate a rich, 5-shade festive confetti palette from detected theme colors
 */
export function generateHarmoniousConfettiPalette(
  baseHex: string,
  extraHexes: string[] = []
): string[] {
  const normBase = normalizeHex(baseHex) || "#008060";
  const hsl = hexToHsl(normBase);

  // If the brand is strictly monochrome (saturation < 15%),
  // supply an ultra-premium champagne gold & slate celebration palette
  if (hsl.s < 15) {
    return [normBase, "#f59e0b", "#475569", "#fbbf24", "#94a3b8"];
  }

  // Filter out pure whites, pure blacks, and dull greys from extraHexes
  const validExtras = extraHexes
    .map(normalizeHex)
    .filter((h): h is string => {
      if (!h || h === normBase) return false;
      const hHsl = hexToHsl(h);
      // Skip pure black, pure white, or extreme near-white/near-black
      if (hHsl.l > 95 || hHsl.l < 8) return false;
      return true;
    });

  const palette: string[] = [normBase];

  // Include vibrant valid extras if provided (e.g. secondary accent from theme)
  for (const extra of validExtras) {
    const extraHsl = hexToHsl(extra);
    // Prefer colorful accents (saturation >= 30%)
    if (palette.length < 3 && !palette.includes(extra) && extraHsl.s >= 30) {
      palette.push(extra);
    }
  }

  // Complete up to 5 colors with harmonious energetic shades
  // Shade 2: Vibrant lighter tint / spark
  if (palette.length < 2) {
    palette.push(
      hslToHex(
        hsl.h,
        Math.min(100, Math.max(70, hsl.s + 10)),
        Math.min(75, Math.max(55, hsl.l + 22))
      )
    );
  }

  // Shade 3: Deep rich contrast shade
  if (palette.length < 3) {
    palette.push(
      hslToHex(
        hsl.h,
        hsl.s,
        Math.max(16, hsl.l - 12)
      )
    );
  }

  // Shade 4: Analogous/triadic color pop (+35° hue)
  if (palette.length < 4) {
    palette.push(
      hslToHex(
        (hsl.h + 35) % 360,
        Math.min(100, Math.max(65, hsl.s)),
        Math.min(70, Math.max(45, hsl.l))
      )
    );
  }

  // Shade 5: Complementary / festive accent (+65° hue)
  if (palette.length < 5) {
    palette.push(
      hslToHex(
        (hsl.h + 65) % 360,
        Math.min(100, Math.max(70, hsl.s)),
        Math.min(65, Math.max(50, hsl.l))
      )
    );
  }

  return palette.slice(0, 5);
}

/**
 * Fetch HTML content from storefront with redirect support
 */
async function fetchStorefrontPage(urlStr: string): Promise<{ status: number; body: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(urlStr, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.text();
    return { status: res.status, body };
  } catch {
    return { status: 500, body: "" };
  }
}

/**
 * Parse config/settings_data.json content from a Shopify Theme
 */
function parseThemeSettingsData(content: string): {
  primaryColor: string | null;
  foundColors: string[];
} {
  try {
    const json = JSON.parse(content);
    const current = json?.current || {};
    const foundColors: string[] = [];

    // 1. Color Schemes (Shopify OS 2.0 / Dawn 8+)
    if (current.color_schemes && typeof current.color_schemes === "object") {
      for (const schemeKey of Object.keys(current.color_schemes)) {
        const s = current.color_schemes[schemeKey]?.settings;
        if (s) {
          if (s.primary_button_background) foundColors.push(s.primary_button_background);
          if (s.secondary_button_background) foundColors.push(s.secondary_button_background);
          if (s.text && s.text !== "#ffffff" && s.text !== "#000000") foundColors.push(s.text);
        }
      }
    }

    // 2. Direct theme settings keys
    const directKeys = [
      "colors_accent_1",
      "colors_accent_2",
      "colors_solid_button_labels",
      "colors_outline_button_labels",
      "brand_color",
      "primary_color",
      "accent_color",
      "color_primary",
      "color_button",
      "button_color",
    ];

    for (const key of directKeys) {
      if (current[key] && typeof current[key] === "string") {
        foundColors.push(current[key]);
      }
    }

    // Filter valid hex colors
    const validHexes = foundColors
      .map(normalizeHex)
      .filter((h): h is string => Boolean(h));

    // Pick primary: find the first color that isn't pure white or pure black
    const saturated = validHexes.filter((hex) => {
      const hsl = hexToHsl(hex);
      return hsl.s >= 15 && hsl.l >= 10 && hsl.l <= 90;
    });

    const primaryColor = saturated[0] || validHexes[0] || null;

    return {
      primaryColor,
      foundColors: [...new Set(validHexes)],
    };
  } catch {
    return { primaryColor: null, foundColors: [] };
  }
}

/**
 * Extract brand colors from storefront HTML (CSS variables, meta tags, and style sheets)
 */
function extractColorsFromHtml(html: string): {
  primaryColor: string | null;
  foundColors: string[];
} {
  const foundColors: string[] = [];

  // 1. Check meta theme-color
  const metaMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["'](#[0-9a-fA-F]{3,6})["']/i);
  if (metaMatch && metaMatch[1]) {
    foundColors.push(metaMatch[1]);
  }

  // 2. Check CSS variables like --color-button, --color-primary, --color-base-accent-1
  const cssVarMatches = html.matchAll(
    /--(?:color-(?:button|primary|accent|base-accent-[12]|base-solid-button-labels)):\s*(#[0-9a-fA-F]{3,6})/gi
  );
  for (const m of cssVarMatches) {
    if (m[1]) foundColors.push(m[1]);
  }

  // 3. General hex patterns in styles
  const allHexes = html.match(/#[0-9a-fA-F]{6}/g) || [];
  for (const h of allHexes) {
    foundColors.push(h);
  }

  const validHexes = foundColors
    .map(normalizeHex)
    .filter((h): h is string => Boolean(h));

  // Find colors with saturation >= 30% and reasonable lightness (true vibrant brand accents)
  const saturated = validHexes.filter((hex) => {
    const hsl = hexToHsl(hex);
    return hsl.s >= 30 && hsl.l >= 20 && hsl.l <= 80;
  });

  const uniqueSaturated = [...new Set(saturated)];
  const primaryColor = uniqueSaturated[0] || validHexes[0] || null;

  return {
    primaryColor,
    foundColors: [...new Set(validHexes)],
  };
}

/**
 * Main export: Get the active storefront theme colors for a shop
 */
export async function getStorefrontThemeColors({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken?: string;
}): Promise<ThemeBrandColors> {
  // Check cache
  const cached = THEME_CACHE.get(shop);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let themeName = "Store Theme";
  let primaryColor: string | null = null;
  let rawColors: string[] = [];
  let source: ThemeBrandColors["source"] = "default";

  // Tier 1: Try Admin GraphQL if accessToken is available
  if (accessToken) {
    try {
      const query = JSON.stringify({
        query: `{
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
        }`,
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: query,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const parsed: any = await res.json();
        const mainTheme = parsed?.data?.themes?.nodes?.[0];
        if (mainTheme) {
          themeName = mainTheme.name || "Published Theme";
          const settingsFile = mainTheme.files?.nodes?.[0];
          const content = settingsFile?.body?.content;
          if (content) {
            const extracted = parseThemeSettingsData(content);
            if (extracted.primaryColor) {
              primaryColor = extracted.primaryColor;
              rawColors = extracted.foundColors;
              source = "admin_api";
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ThemeService] Admin API theme fetch error:", err);
    }
  }

  // Tier 2: Storefront Scraper Fallback if Admin API did not yield colors
  if (!primaryColor) {
    try {
      // First try storefront root, follow redirects to password if protected
      const { body } = await fetchStorefrontPage(`https://${shop}`);
      if (body) {
        const extracted = extractColorsFromHtml(body);
        if (extracted.primaryColor) {
          primaryColor = extracted.primaryColor;
          rawColors = extracted.foundColors;
          source = "storefront_html";
          themeName = "Storefront Theme";
        }
      }
    } catch (err) {
      console.warn("[ThemeService] Storefront HTML scrape error:", err);
    }
  }

  // Tier 3: High quality default (Shopify primary emerald or vibrant brand)
  if (!primaryColor) {
    primaryColor = "#008060";
    themeName = "Shopify Theme";
    rawColors = ["#008060", "#479ccf", "#212b36"];
    source = "default";
  }

  // Generate 5-color confetti palette
  const brandColors = generateHarmoniousConfettiPalette(
    primaryColor,
    rawColors
  );

  const result: ThemeBrandColors = {
    themeName,
    primaryColor,
    brandColors,
    rawColors,
    source,
  };

  // Cache result
  THEME_CACHE.set(shop, { data: result, timestamp: Date.now() });

  return result;
}
