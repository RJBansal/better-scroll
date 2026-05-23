import type { RouterClient } from "@orpc/server"
import { z } from "zod"

import { publicProcedure } from "../index"
import { runDailyAgentFromBookmarks } from "../services/agent"
import { listBookmarks, replaceBookmarks } from "../services/bookmarks"
import { getDefaultProfile, updateDefaultProfile } from "../services/profile"
import { getLatestReels } from "../services/reels"

const MAX_AGENT_REELS = 10
const MAX_REAL_REELS = 6

const replaceBookmarksInput = z.object({
  urls: z.array(z.url()).max(5000),
})

const runDailyInput = z.object({
  reels: z.number().int().min(1).max(MAX_AGENT_REELS).optional(),
  reelDurationSec: z.number().int().min(8).max(120).optional(),
  realReels: z.number().int().min(0).max(MAX_REAL_REELS).optional(),
})

const updateProfileInput = z.object({
  name: z.string().min(1).max(64).optional(),
  goals: z.array(z.string().min(1).max(280)).max(20).optional(),
  hobbies: z.array(z.string().min(1).max(280)).max(20).optional(),
  youtubeHistory: z.array(z.string().min(1).max(280)).max(50).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK"
  }),
  bookmarks: {
    list: publicProcedure.handler(() => listBookmarks()),
    replace: publicProcedure
      .input(replaceBookmarksInput)
      .handler(({ input }) => replaceBookmarks(input.urls)),
  },
  agent: {
    runDaily: publicProcedure
      .input(runDailyInput)
      .handler(({ input }) => runDailyAgentFromBookmarks(input.reels, input.reelDurationSec, input.realReels)),
  },
  profile: {
    get: publicProcedure.handler(() => getDefaultProfile()),
    update: publicProcedure
      .input(updateProfileInput)
      .handler(({ input }) => updateDefaultProfile(input)),
  },
  reels: {
    latest: publicProcedure.handler(() => getLatestReels()),
  },
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
