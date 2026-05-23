import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load from packages/env/.env (canonical env location) then fall back to CWD
dotenv.config({ path: "../env/.env" });

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
