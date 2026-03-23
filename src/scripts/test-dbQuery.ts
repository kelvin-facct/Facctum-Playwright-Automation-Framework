/**
 * Test script for dbQuery helper
 * 
 * Run with existing tunnel:
 *   npx ts-node src/scripts/test-dbQuery.ts
 * 
 * Run with auto SSO + tunnel:
 *   npx ts-node src/scripts/test-dbQuery.ts --full
 */
import { queryWithExistingTunnel, executeQuery } from "../helpers/dbQuery";

async function main() {
  const useFullFlow = process.argv.includes("--full");
  
  console.log("=".repeat(50));
  console.log("  Database Query Test");
  console.log("=".repeat(50));
  console.log(`Mode: ${useFullFlow ? "Full (SSO + Tunnel)" : "Existing Tunnel"}\n`);

  try {
    let results;
    
    if (useFullFlow) {
      // Full flow: SSO login + start tunnel + query + cleanup
      results = await executeQuery(
        "SELECT id, case_ref_num, case_status_id FROM cases WHERE is_deleted = false ORDER BY id DESC LIMIT 5"
      );
    } else {
      // Use existing tunnel (must run db-tunnel.bat first)
      results = await queryWithExistingTunnel(
        "SELECT id, case_ref_num, case_status_id FROM cases WHERE is_deleted = false ORDER BY id DESC LIMIT 5"
      );
    }

    console.log("\nResults:");
    console.table(results);
    console.log("\n✓ Query successful!");
    
  } catch (error: any) {
    console.error("\n✗ Error:", error.message);
    if (!useFullFlow) {
      console.log("\nTip: Make sure the tunnel is running (scripts\\db-tunnel.bat)");
      console.log("Or run with --full flag to auto-handle SSO and tunnel");
    }
    process.exit(1);
  }
}

main();
