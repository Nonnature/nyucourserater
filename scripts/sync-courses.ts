/**
 * Standalone script to sync course data from NYU Bulletins FOSE API.
 *
 * Usage:
 *   npx tsx scripts/sync-courses.ts
 */

import "dotenv/config";
import { syncAll } from "../src/lib/scraper/sync";

async function main() {
  console.log("=== NYU Course Rater — Course Sync ===");
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const start = Date.now();
  await syncAll();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\nFinished in ${elapsed}s`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
