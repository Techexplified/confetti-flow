import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const TUNNEL_URL = "https://walt-pharmaceutical-tablets-stats.trycloudflare.com";

async function main() {
  const sessions = await prisma.session.findMany();
  const activeSession = sessions.find((s) => s.shop.includes("announcement-generator-2"));
  if (!activeSession) { console.error("No session found"); return; }

  const shop = activeSession.shop;
  const token = activeSession.accessToken;

  const shopRes = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query: `{ shop { id } }` }),
  });
  const shopJson = await shopRes.json();
  const shopGid = shopJson?.data?.shop?.id;

  const setRes = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `mutation SetAppUrl($mf: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $mf) {
          metafields { id value }
          userErrors { field message }
        }
      }`,
      variables: {
        mf: [{
          namespace: "confetti_flow",
          key: "app_url",
          value: TUNNEL_URL,
          type: "single_line_text_field",
          ownerId: shopGid,
        }],
      },
    }),
  });
  const setJson = await setRes.json();
  const mf = setJson?.data?.metafieldsSet?.metafields?.[0];
  const errors = setJson?.data?.metafieldsSet?.userErrors || [];
  if (errors.length) { console.error("Errors:", errors); return; }
  console.log(`✅ Metafield updated: confetti_flow.app_url = ${mf?.value}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
