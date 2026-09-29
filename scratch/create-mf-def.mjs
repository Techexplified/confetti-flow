import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.session.findFirst({
    where: { shop: { contains: "announcement-generator-2" } }
  });
  if (!s) { console.error("No session found"); return; }

  const res = await fetch(`https://${s.shop}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": s.accessToken,
    },
    body: JSON.stringify({
      query: `mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
            access {
              storefront
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      variables: {
        definition: {
          name: "ConfettiFlow App URL",
          namespace: "confetti_flow",
          key: "app_url",
          type: "single_line_text_field",
          ownerType: "SHOP",
          access: {
            storefront: "PUBLIC_READ",
          },
        },
      },
    }),
  });

  const data = await res.json();
  console.log("Create definition result:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
