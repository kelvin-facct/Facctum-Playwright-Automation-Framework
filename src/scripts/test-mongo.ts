/**
 * Test MongoDB connection
 * Usage: npx ts-node src/scripts/test-mongo.ts
 */
import { MongoDBHelper, UKSanctionsMongoQueries } from "../helpers/mongoHelper";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.secrets
dotenv.config({ path: path.join(__dirname, "../config/.env.secrets") });

async function testMongoConnection() {
  console.log("=== MongoDB Connection Test ===\n");
  
  console.log("Configuration:");
  console.log(`  Host: ${process.env.MONGO_HOST || "localhost"}`);
  console.log(`  Port: ${process.env.MONGO_PORT || "27023"}`);
  console.log(`  Database: ${process.env.MONGO_DATABASE || "facctum"}`);
  console.log(`  Username: ${process.env.MONGO_USERNAME || "(not set)"}`);
  console.log(`  TLS Enabled: ${process.env.MONGO_TLS_ENABLED || "false"}`);
  console.log("");

  const mongo = new MongoDBHelper();

  try {
    console.log("Connecting to MongoDB...");
    await mongo.connect();
    console.log("✅ Connected successfully!\n");

    // Test UK Sanctions queries
    console.log("Testing UK Sanctions queries...");
    const ukSanctions = new UKSanctionsMongoQueries(mongo);
    
    const activeCount = await ukSanctions.getActiveRecordsWithIdTypeCount();
    console.log(`  Active records with ID Type: ${activeCount}`);

    const errorCount = await ukSanctions.getRecordsByStatusCount(3000);
    console.log(`  Error records (status 3000): ${errorCount}`);

    console.log("\n✅ All queries executed successfully!");

  } catch (error) {
    console.error(`\n❌ Connection failed: ${error}`);
    console.log("\nTroubleshooting:");
    console.log("  1. Check if MongoDB is running and accessible");
    console.log("  2. Verify the host, port, and credentials in .env.secrets");
    console.log("  3. If using SSH tunnel, ensure it's running");
    console.log("  4. Check if TLS is required (MONGO_TLS_ENABLED)");
  } finally {
    await mongo.disconnect();
  }
}

testMongoConnection();
