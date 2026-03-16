import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("C:/Users/fr949/Downloads/Closet_AI");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("main app includes core workspace sections", async () => {
  const source = await read("src/components/closet-app.tsx");

  assert.match(source, /id="closets"/);
  assert.match(source, /id="items"/);
  assert.match(source, /id="outfits"/);
});

test("support api routes exist in source tree", async () => {
  const dashboard = await read("src/app/api/dashboard/route.ts");
  const tags = await read("src/app/api/tags/route.ts");
  const locations = await read("src/app/api/locations/route.ts");
  const savedFilters = await read("src/app/api/saved-filters/route.ts");
  const generatedImage = await read("src/app/api/items/generate-image/route.ts");

  assert.match(dashboard, /export async function GET/);
  assert.match(tags, /export async function POST/);
  assert.match(locations, /export async function POST/);
  assert.match(savedFilters, /export async function POST/);
  assert.match(generatedImage, /export async function POST/);
});

test("expanded rls migration includes core ownership policies", async () => {
  const migration = await read("supabase/migrations/00002_expand_rls.sql");

  assert.match(migration, /create policy "items_select_own"/);
  assert.match(migration, /create policy "outfits_select_own"/);
  assert.match(migration, /create policy "care_logs_select_own"/);
  assert.match(migration, /create policy "saved_filters_select_own"/);
});
