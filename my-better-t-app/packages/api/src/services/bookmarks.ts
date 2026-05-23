import { DEFAULT_PROFILE_ID, bookmarks, db } from "@my-better-t-app/db"
import { eq } from "drizzle-orm"

import { ensureDefaultProfile } from "./profile"

const BOOKMARK_SAMPLE_LIMIT = 8

export async function listBookmarks(profileId = DEFAULT_PROFILE_ID) {
  const rows = await db
    .select({ url: bookmarks.url })
    .from(bookmarks)
    .where(eq(bookmarks.profileId, profileId))

  return {
    count: rows.length,
    sample: rows.slice(0, BOOKMARK_SAMPLE_LIMIT).map((row) => row.url),
  }
}

export async function listBookmarkUrls(profileId = DEFAULT_PROFILE_ID) {
  const rows = await db
    .select({ url: bookmarks.url })
    .from(bookmarks)
    .where(eq(bookmarks.profileId, profileId))

  return rows.map((row) => row.url)
}

export async function replaceBookmarks(
  urls: string[],
  profileId = DEFAULT_PROFILE_ID,
) {
  const uniqueUrls = [...new Set(urls)]
  const now = Date.now()

  await ensureDefaultProfile()
  await db.delete(bookmarks).where(eq(bookmarks.profileId, profileId))

  if (uniqueUrls.length > 0) {
    await db.insert(bookmarks).values(
      uniqueUrls.map((url) => ({
        profileId,
        url,
        createdAt: now,
      })),
    )
  }

  return { count: uniqueUrls.length }
}
