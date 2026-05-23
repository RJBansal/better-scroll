import { type ReelMeta, agentRuns, db } from "@my-better-t-app/db";
import { desc, eq } from "drizzle-orm";

export async function getLatestReels(): Promise<ReelMeta[]> {
  const rows = await db
    .select({ reels: agentRuns.reels })
    .from(agentRuns)
    .where(eq(agentRuns.status, "completed"))
    .orderBy(desc(agentRuns.completedAt))
    .limit(1);

  return rows[0]?.reels ?? [];
}
