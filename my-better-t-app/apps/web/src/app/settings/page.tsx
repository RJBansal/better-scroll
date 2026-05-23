"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { BookmarkUpload } from "@/components/settings/bookmark-upload"
import { SettingsRow, SettingsSection } from "@/components/settings/settings-row"
import { usePreferences } from "@/lib/storage"
import { SOURCE_LABELS, SOURCE_TYPES, type SourceType } from "@/lib/types"

const REEL_COUNT_MIN = 3
const REEL_COUNT_MAX = 20
const DURATION_MIN = 15
const DURATION_MAX = 45

export default function SettingsPage() {
  const { prefs, update, hydrated } = usePreferences()

  return (
    <main className="h-svh w-svw overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-6">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-foreground/55 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to feed
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
              Tune what tomorrow&apos;s drop is built from. Changes apply on the next
              run.
            </p>
          </div>
        </header>

        <SettingsSection title="Sources">
          <BookmarkUpload />
        </SettingsSection>

        <SettingsSection title="What to include" hint="Source mix">
          {SOURCE_TYPES.map((type) => (
            <SettingsRow
              key={type}
              label={SOURCE_LABELS[type]}
              description={DESCRIPTIONS[type]}
              control={
                <Toggle
                  checked={prefs.enabledSources[type]}
                  onChange={(value) =>
                    update({
                      enabledSources: { ...prefs.enabledSources, [type]: value },
                    })
                  }
                  label={`Toggle ${SOURCE_LABELS[type]}`}
                  disabled={!hydrated}
                />
              }
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Drop">
          <SettingsRow
            label="Reels per drop"
            description="The whole drop is finite. Pick how finite."
            htmlFor="reel-count"
            control={
              <NumberStepper
                id="reel-count"
                value={prefs.dailyReelCount}
                min={REEL_COUNT_MIN}
                max={REEL_COUNT_MAX}
                onChange={(value) => update({ dailyReelCount: value })}
                disabled={!hydrated}
              />
            }
          />
          <SettingsRow
            label="Drop time"
            description="Local time. The agent runs overnight; reels are ready by this time."
            htmlFor="drop-time"
            control={
              <input
                id="drop-time"
                type="time"
                value={prefs.dropTime}
                onChange={(event) => update({ dropTime: event.target.value })}
                disabled={!hydrated}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm tabular-nums text-foreground focus-visible:border-ring focus-visible:outline-none disabled:opacity-50"
              />
            }
          />
          <SettingsRow
            label="Reel length target"
            description="Generated clips will aim for this duration in seconds."
            htmlFor="reel-duration"
            control={
              <NumberStepper
                id="reel-duration"
                value={prefs.reelDurationSec}
                min={DURATION_MIN}
                max={DURATION_MAX}
                step={1}
                suffix="s"
                onChange={(value) => update({ reelDurationSec: value })}
                disabled={!hydrated}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Playback">
          <SettingsRow
            label="Reduce motion"
            description="Disable transitions and autoplay-driven animation."
            control={
              <Toggle
                checked={prefs.reducedMotion}
                onChange={(value) => update({ reducedMotion: value })}
                label="Toggle reduce motion"
                disabled={!hydrated}
              />
            }
          />
        </SettingsSection>

        <footer className="pb-8 text-[11px] uppercase tracking-[0.2em] text-foreground/35">
          Better Scroll · MVP
        </footer>
      </div>
    </main>
  )
}

const DESCRIPTIONS: Record<SourceType, string> = {
  paper: "Research papers and arXiv links from your bookmarks.",
  bookmark: "General web bookmarks and articles.",
  video: "YouTube watch-later and saved video links.",
  pdf: "PDFs in your saved sources.",
}

type ToggleProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}

function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`inline-block size-5 translate-x-0.5 rounded-full bg-foreground transition-transform ${
          checked ? "translate-x-[1.125rem]" : ""
        }`}
      />
    </button>
  )
}

type NumberStepperProps = {
  id?: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
  disabled?: boolean
}

function NumberStepper({
  id,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  disabled,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-input">
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="grid size-8 place-items-center text-sm text-foreground/70 transition-colors hover:text-foreground disabled:opacity-30"
      >
        −
      </button>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(clamp(next))
        }}
        className="w-12 bg-transparent text-center text-sm tabular-nums text-foreground focus-visible:outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
      />
      {suffix ? (
        <span className="-ml-1 pr-2 text-xs text-muted-foreground">{suffix}</span>
      ) : null}
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="grid size-8 place-items-center text-sm text-foreground/70 transition-colors hover:text-foreground disabled:opacity-30"
      >
        +
      </button>
    </div>
  )
}
