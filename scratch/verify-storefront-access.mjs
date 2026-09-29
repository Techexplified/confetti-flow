import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.session.findFirst({
    where: { shop: { contains: "announcement-generator-2" } }
  });
  if (!s) { console.error("No session found"); return; }

  // Query via Admin API to see if storefront access is active
  const res = await fetch(`https://${s.shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": s.accessToken },
    body: JSON.stringify({
      query: `{
        shop {
          metafield(namespace: "confetti_flow", key: "app_url") {
            id
            value
            type
          }
        }
      }`,
    }),
  });
  const data = await res.json();
  console.log("Admin shop metafield:", JSON.stringify(data, null, 2));

  // Check storefront access on definition
  const defRes = await fetch(`https://${s.shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": s.accessToken },
    body: JSON.stringify({
      query: `{
        metafieldDefinitions(first: 10, ownerType: SHOP, namespace: "confetti_flow") {
          edges {
            node {
              id
              name
              key
              namespace
              access {
                storefront
              }
            }
          }
        }
      }`,
    }),
  });
  const defData = await defRes.json();
  console.log("Metafield definition:", JSON.stringify(defData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
