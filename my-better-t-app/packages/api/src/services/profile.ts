import { loadProfile, type UserProfile } from "@my-better-t-app/agent"
import {
  DEFAULT_PROFILE_ID,
  db,
  profiles,
} from "@my-better-t-app/db"
import { eq } from "drizzle-orm"

type StoredProfile = typeof profiles.$inferSelect

function toUserProfile(profile: StoredProfile, bookmarks?: string[]): UserProfile {
  return {
    name: profile.name,
    goals: profile.goals,
    hobbies: profile.hobbies,
    youtube_history: profile.youtubeHistory,
    bookmarks,
    notes: profile.notes ?? undefined,
  }
}

export async function ensureDefaultProfile() {
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, DEFAULT_PROFILE_ID))
    .limit(1)

  if (existing[0]) return existing[0]

  const sample = await loadProfile()
  const now = Date.now()

  const row = {
    id: DEFAULT_PROFILE_ID,
    name: sample.name,
    goals: sample.goals,
    hobbies: sample.hobbies,
    youtubeHistory: sample.youtube_history ?? [],
    notes: sample.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(profiles).values(row)

  return row
}

export async function loadDefaultProfile(bookmarks: string[]) {
  const profile = await ensureDefaultProfile()
  return toUserProfile(profile, bookmarks)
}
