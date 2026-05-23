"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { client, orpc } from "@/utils/orpc"
import { useQuery, useQueryClient } from "@tanstack/react-query"

type ProfileDraft = {
  name: string
  goals: string
  hobbies: string
  youtubeHistory: string
  notes: string
}

function toLines(arr: string[]): string {
  return arr.join("\n")
}

function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ProfileEditor() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useQuery(orpc.profile.get.queryOptions())

  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (profile && !draft) {
      setDraft({
        name: profile.name,
        goals: toLines(profile.goals),
        hobbies: toLines(profile.hobbies),
        youtubeHistory: toLines(profile.youtubeHistory),
        notes: profile.notes ?? "",
      })
    }
  }, [profile, draft])

  const scheduleUpdate = useCallback(
    (next: ProfileDraft) => {
      setDraft(next)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          await client.profile.update({
            name: next.name.trim() || undefined,
            goals: fromLines(next.goals),
            hobbies: fromLines(next.hobbies),
            youtubeHistory: fromLines(next.youtubeHistory),
            notes: next.notes.trim() || null,
          })
          await queryClient.invalidateQueries(orpc.profile.get.queryOptions())
        } catch {
          // silently ignore — next keystroke will retry
        }
      }, 800)
    },
    [queryClient],
  )

  if (isLoading || !draft) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Loading profile…
      </div>
    )
  }

  const fieldClass =
    "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none resize-none"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-name" className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={draft.name}
          maxLength={64}
          placeholder="Your name"
          onChange={(e) => scheduleUpdate({ ...draft, name: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-goals" className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Goals
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/60">one per line</span>
        </label>
        <textarea
          id="profile-goals"
          rows={4}
          value={draft.goals}
          placeholder={"Learn something new this year\nFinish a personal project"}
          onChange={(e) => scheduleUpdate({ ...draft, goals: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-hobbies" className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Hobbies
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/60">one per line</span>
        </label>
        <textarea
          id="profile-hobbies"
          rows={4}
          value={draft.hobbies}
          placeholder={"Photography\nCooking\nReading"}
          onChange={(e) => scheduleUpdate({ ...draft, hobbies: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-youtube" className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          YouTube / video history
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/60">one title per line</span>
        </label>
        <textarea
          id="profile-youtube"
          rows={4}
          value={draft.youtubeHistory}
          placeholder={"How to get better at public speaking\nBeginner's guide to investing"}
          onChange={(e) => scheduleUpdate({ ...draft, youtubeHistory: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-notes" className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Notes
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/60">free text context for the agent</span>
        </label>
        <textarea
          id="profile-notes"
          rows={3}
          value={draft.notes}
          placeholder="Anything else the agent should know — current focus, things you want more or less of, context that shapes what's useful to you."
          onChange={(e) => scheduleUpdate({ ...draft, notes: e.target.value })}
          className={fieldClass}
        />
      </div>
    </div>
  )
}
