import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";

// Exercise the actual route with isolated authentication/database dependencies.
function loadRoute(file: string, dependencies: Record<string, unknown>) {
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, (request: unknown) => Promise<Response>> = {};
  vm.runInNewContext(source, {
    exports, console, Set, Date,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

async function run() {
  let allowed = true;
  let connected = true;
  let authenticated = true;
  let saved: unknown;
  const items = [{ id: "visible", media: [] }, { id: "hidden", media: [] }, { id: "listed", media: [] }];
  const filter = (where: { id?: { notIn: string[] } }) => items.filter((item) => !where.id?.notIn.includes(item.id));
  const dependencies = {
    "next/server": { NextResponse: Response },
    "@/lib/auth": { auth: async () => authenticated ? { user: { id: "user" } } : null },
    "@/lib/permissions": { PERMISSIONS: { INVENTORY_VIEW: "view", INVENTORY_EDIT: "edit" }, checkUserPermission: async () => allowed },
    "@/lib/prisma": { prisma: {
      marketplaceShop: { findFirst: async () => connected ? { id: "shop" } : null },
      inventory: {
        count: async ({ where }: { where: Parameters<typeof filter>[0] }) => filter(where).length,
        findMany: async ({ where, skip, take }: { where: Parameters<typeof filter>[0]; skip: number; take: number }) => filter(where).slice(skip, skip + take),
        findUnique: async () => ({ id: "item" }),
      },
      $queryRaw: async () => [{ id: "listed" }],
    } },
    "@prisma/client": { Prisma },
    "@/lib/inventory-schema-ensure": { ensureInventoryBraceletSchema: async () => {} },
    "@/lib/inventory-ready-to-sell": { buildReadyToSellWhere: () => ({ status: "IN_STOCK" }) },
    "@/lib/marketplace-control-center": { MARKETPLACE_LISTING_SCOPE_SQL: "1 = 1", marketplaceInventoryJoinSql: () => "" },
    "@/lib/marketplace/listing-visibility": {
      hiddenListingInventoryIds: async () => ["hidden"],
      setListingItemHidden: async (_db: unknown, input: unknown) => { saved = input; },
    },
  };
  const { GET } = loadRoute("app/api/inventory/search/route.ts", dependencies);
  const request = (query: string) => ({ nextUrl: { searchParams: new URLSearchParams(query) } });
  const normal = await (await GET(request("marketplace=ETSY&shopId=shop"))).json();
  assert.equal(normal.total, 1, "Hidden and already listed items are excluded from totals");
  assert.deepEqual(normal.items.map((item: { id: string }) => item.id), ["visible"]);
  const shown = await (await GET(request("marketplace=ETSY&shopId=shop&showHidden=1"))).json();
  assert.equal(shown.total, 2);
  assert.equal(shown.items.find((item: { id: string }) => item.id === "hidden").hiddenForListing, true);
  assert.equal(shown.items.some((item: { id: string }) => item.id === "listed"), false, "Show hidden never reintroduces existing listings");
  const unscoped = await (await GET(request(""))).json();
  assert.equal(unscoped.total, 3, "Ordinary inventory search is unaffected");
  assert.equal((await GET(request("marketplace=ETSY"))).status, 400);
  connected = false;
  assert.equal((await GET(request("marketplace=ETSY&shopId=shop"))).status, 404);
  connected = true;

  const { z } = await import("zod");
  const { POST } = loadRoute("app/api/marketplace/listing-visibility/route.ts", { ...dependencies, zod: { z } });
  const input = { inventoryId: "10000000-0000-4000-8000-000000000001", shopId: "shop", marketplace: "ETSY", hidden: true };
  const mutation = (body: unknown) => ({ json: async () => body });
  assert.equal((await POST(mutation(input))).status, 200);
  assert.equal(JSON.stringify(saved), JSON.stringify(input));
  assert.equal((await POST(mutation({ ...input, hidden: "true" }))).status, 400);
  assert.equal((await POST(mutation({ ...input, marketplace: "UNKNOWN" }))).status, 400);
  allowed = false;
  assert.equal((await POST(mutation(input))).status, 403);
  assert.equal((await GET(request(""))).status, 403);
  authenticated = false;
  assert.equal((await POST(mutation(input))).status, 401);
  assert.equal((await GET(request(""))).status, 401);
  console.log("Marketplace listing visibility route tests passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
