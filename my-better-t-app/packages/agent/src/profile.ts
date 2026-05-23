import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UserProfile } from "./types.js";

const SAMPLE_PROFILE_PATH = join(
  new URL("../profiles/sample.json", import.meta.url).pathname,
);

export async function loadProfile(profilePath?: string): Promise<UserProfile> {
  const path = profilePath ?? SAMPLE_PROFILE_PATH;
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as UserProfile;
  } catch (err) {
    throw new Error(
      `Failed to load profile from "${path}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
