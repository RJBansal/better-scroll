"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

import { client } from "@/utils/orpc"

type AgentRunResult = {
  runId: string
  outDir: string
  readUpPath: string
  seedsPath: string
  reels: string[]
}

export function GenerateDrop() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AgentRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAgent = async () => {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const next = await client.agent.runDaily({ reels: 1 })
      setResult(next)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Agent run failed.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={runAgent}
        disabled={running}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-progress disabled:opacity-70"
      >
        {running ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {running ? "Generating..." : "Generate drop"}
      </button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {result ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card/30 p-4 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Run {result.runId}</div>
          <div className="truncate">Output: {result.outDir}</div>
          <div className="truncate">Read-up: {result.readUpPath}</div>
          <div className="truncate">Seeds: {result.seedsPath}</div>
          {result.reels.length > 0 ? (
            <ul className="flex flex-col gap-1 pt-1">
              {result.reels.map((reel) => (
                <li key={reel} className="truncate">
                  {reel}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
