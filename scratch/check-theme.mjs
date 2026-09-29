import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.session.findFirst({
    where: { shop: { contains: "announcement-generator-2" } }
  });
  if (!s) { console.error("No session found"); return; }

  const themesRes = await fetch(`https://${s.shop}/admin/api/2026-01/themes.json`, {
    headers: { "X-Shopify-Access-Token": s.accessToken }
  });
  const themesData = await themesRes.json();
  const mainTheme = themesData.themes?.find(t => t.role === "main");
  console.log("Main theme:", mainTheme?.id, mainTheme?.name);

  if (mainTheme) {
    const assetRes = await fetch(`https://${s.shop}/admin/api/2026-01/themes/${mainTheme.id}/assets.json?asset[key]=config/settings_data.json`, {
      headers: { "X-Shopify-Access-Token": s.accessToken }
    });
    const assetData = await assetRes.json();
    const config = JSON.parse(assetData.asset?.value || "{}");
    const blocks = config.current?.blocks || {};
    console.log("App blocks in settings_data.json:", JSON.stringify(blocks, null, 2));

    // Also check theme.liquid and password.liquid
    const themeLiquidRes = await fetch(`https://${s.shop}/admin/api/2026-01/themes/${mainTheme.id}/assets.json?asset[key]=layout/theme.liquid`, {
      headers: { "X-Shopify-Access-Token": s.accessToken }
    });
    const themeLiquidData = await themeLiquidRes.json();
    const val = themeLiquidData.asset?.value || '';
    console.log("theme.liquid length:", val.length);
    console.log("theme.liquid body end:", val.slice(val.lastIndexOf('</body>') - 200, val.lastIndexOf('</body>') + 50));
    console.log("theme.liquid has content_for_header:", themeLiquidData.asset?.value?.includes("content_for_header"));

    const passLiquidRes = await fetch(`https://${s.shop}/admin/api/2026-01/themes/${mainTheme.id}/assets.json?asset[key]=layout/password.liquid`, {
      headers: { "X-Shopify-Access-Token": s.accessToken }
    });
    const passLiquidData = await passLiquidRes.json();
    console.log("--- password.liquid ---");
    console.log(passLiquidData.asset?.value);
    console.log("------------------------");
  }
  const mfDefRes = await fetch(`https://${s.shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": s.accessToken },
    body: JSON.stringify({
      query: `{ metafieldDefinitions(first: 20, ownerType: SHOP) { edges { node { name namespace key access { storefront } } } } }`,
    }),
  });
  console.log("Metafield definitions:", JSON.stringify(await mfDefRes.json(), null, 2));

  // Check theme preview URL
  console.log(`Theme preview URL: https://${s.shop}/?preview_theme_id=${mainTheme.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
