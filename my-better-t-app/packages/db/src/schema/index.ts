import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export type ReelMeta = {
  id: string
  videoUrl: string
  caption: string
  sourceTitle: string
  sourceUrl: string
  durationSec: number
  category: string
  /** generated | pexels | reddit */
  source: string
}

export const DEFAULT_PROFILE_ID = "default"

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goals: text("goals", { mode: "json" }).$type<string[]>().notNull(),
  hobbies: text("hobbies", { mode: "json" }).$type<string[]>().notNull(),
  youtubeHistory: text("youtube_history", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.url] }),
    index("bookmarks_profile_id_idx").on(table.profileId),
  ],
)

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["started", "completed", "failed"],
    }).notNull(),
    outDir: text("out_dir"),
    readUpPath: text("read_up_path"),
    seedsPath: text("seeds_path"),
    reels: text("reels", { mode: "json" }).$type<ReelMeta[] | null>(),
    error: text("error"),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [index("agent_runs_profile_id_idx").on(table.profileId)],
)
