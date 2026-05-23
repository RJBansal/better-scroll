"use client"

import { useEffect, useRef, useState } from "react"
import { Bookmark, Heart, Volume2, VolumeX } from "lucide-react"

import type { Reel } from "@/lib/types"

import { ReelInfoSheet } from "./reel-info-sheet"

type ReelCanvasProps = {
  reel: Reel
  index: number
  muted: boolean
  onToggleMuted: () => void
}

export function ReelCanvas({ reel, index, muted, onToggleMuted }: ReelCanvasProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isVisible, setIsVisible] = useState(index === 0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVisible) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isVisible])

  return (
    <section
      ref={sectionRef}
      className="relative h-svh w-full snap-start snap-always overflow-hidden bg-background"
      aria-label={`Reel ${index + 1}`}
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        muted={muted}
        loop
        playsInline
        preload={index <= 1 ? "auto" : "metadata"}
        onClick={() => {
          const v = videoRef.current
          if (!v) return
          if (v.paused) void v.play().catch(() => {})
          else v.pause()
        }}
        onTimeUpdate={(event) => {
          const target = event.currentTarget
          if (!target.duration) return
          setProgress(target.currentTime / target.duration)
        }}
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/85 via-background/35 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-5 px-5 pb-10">
        <p className="min-w-0 max-w-[28ch] flex-1 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {reel.caption}
        </p>

        <div className="flex flex-col items-center gap-4 text-foreground/70">
          <ReelAction
            label={liked ? "Unlike" : "Like"}
            onClick={() => setLiked((v) => !v)}
            active={liked}
          >
            <Heart
              className={`size-6 transition-colors ${liked ? "fill-primary stroke-primary" : ""}`}
            />
          </ReelAction>
          <ReelAction
            label={saved ? "Unsave" : "Save"}
            onClick={() => setSaved((v) => !v)}
            active={saved}
          >
            <Bookmark
              className={`size-6 transition-colors ${saved ? "fill-primary stroke-primary" : ""}`}
            />
          </ReelAction>
          <ReelInfoSheet reel={reel} />
          <ReelAction
            label={muted ? "Unmute" : "Mute"}
            onClick={onToggleMuted}
            active={false}
          >
            {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
          </ReelAction>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 h-[2px] bg-foreground/10">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
    </section>
  )
}

type ReelActionProps = {
  label: string
  onClick: () => void
  active: boolean
  children: React.ReactNode
}

function ReelAction({ label, onClick, active, children }: ReelActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}
