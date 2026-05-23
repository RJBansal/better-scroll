import type { RouterClient } from "@orpc/server"
import { z } from "zod"

import { publicProcedure } from "../index"
import { runDailyAgentFromBookmarks } from "../services/agent"
import { listBookmarks, replaceBookmarks } from "../services/bookmarks"

const MAX_AGENT_REELS = 2

const replaceBookmarksInput = z.object({
  urls: z.array(z.url()).max(5000),
})

const runDailyInput = z.object({
  reels: z.number().int().min(1).max(MAX_AGENT_REELS).optional(),
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
      .handler(({ input }) => runDailyAgentFromBookmarks(input.reels)),
  },
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
