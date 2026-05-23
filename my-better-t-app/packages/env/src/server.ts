import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createEnv } from "@t3-oss/env-core"
import dotenv from "dotenv"
import { z } from "zod"

const ENV_DIR = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ENV_PATH = resolve(ENV_DIR, "../.env")

dotenv.config({ quiet: true })
dotenv.config({ path: PACKAGE_ENV_PATH, override: false, quiet: true })

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    CORS_ORIGIN: z
      .string()
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PEXELS_API_KEY: z.string().min(1).optional(),
    REDDIT_CLIENT_ID: z.string().min(1).optional(),
    REDDIT_CLIENT_SECRET: z.string().min(1).optional(),
    REDDIT_USER_AGENT: z.string().min(1).default("better-scroll-agent/0.1"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
