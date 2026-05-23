import type { UserProfile } from "@my-better-t-app/agent";
import { DEFAULT_PROFILE_ID, db, profiles } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";

type StoredProfile = typeof profiles.$inferSelect;

function toUserProfile(profile: StoredProfile, bookmarks?: string[]): UserProfile {
  return {
    name: profile.name,
    goals: profile.goals,
    hobbies: profile.hobbies,
    youtube_history: profile.youtubeHistory,
    bookmarks,
    notes: profile.notes ?? undefined,
  };
}

export async function ensureDefaultProfile(): Promise<StoredProfile> {
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, DEFAULT_PROFILE_ID))
    .limit(1);

  if (existing[0]) return existing[0];

  const now = Date.now();
  const row = {
    id: DEFAULT_PROFILE_ID,
    name: "You",
    goals: [] as string[],
    hobbies: [] as string[],
    youtubeHistory: [] as string[],
    notes: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(profiles).values(row);
  return row;
}

export async function getDefaultProfile(): Promise<StoredProfile> {
  return ensureDefaultProfile();
}

export async function updateDefaultProfile(patch: {
  name?: string;
  goals?: string[];
  hobbies?: string[];
  youtubeHistory?: string[];
  notes?: string | null;
}): Promise<StoredProfile> {
  await ensureDefaultProfile();

  await db
    .update(profiles)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(profiles.id, DEFAULT_PROFILE_ID));

  const updated = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, DEFAULT_PROFILE_ID))
    .limit(1);

  if (!updated[0]) throw new Error("Profile not found after update");
  return updated[0];
}

export async function loadDefaultProfile(bookmarks: string[]): Promise<UserProfile> {
  const profile = await ensureDefaultProfile();
  return toUserProfile(profile, bookmarks);
}
