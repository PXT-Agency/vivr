import postgres from "postgres";

const url = process.argv[2];
const client = postgres(url, { max: 1 });
try {
  const tables = await client`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log("tables:", tables.map((t) => t.table_name).join(", "));
  for (const t of [
    "organizations",
    "actors",
    "star_numbers",
    "inventory_import_batches",
    "inventory_import_rows",
    "vivrs",
    "vivr_versions",
  ]) {
    const result = await client`SELECT count(*)::int AS c FROM ${client(t)}`;
    console.log(`${t}: ${result[0].c} rows`);
  }
  if (url.includes("vivr_dev")) {
    const orgs = await client`SELECT id, name, slug FROM organizations ORDER BY slug`;
    console.log("organizations:", JSON.stringify(orgs));
    const vivrs = await client`SELECT id, organization_id, slug, status FROM vivrs`;
    console.log("vivrs:", JSON.stringify(vivrs));
  }
} finally {
  await client.end();
}
