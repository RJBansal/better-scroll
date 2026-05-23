"use client"

import { ArrowUpRight, Clock, Info } from "lucide-react"
import { Button } from "@my-better-t-app/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@my-better-t-app/ui/components/sheet"

import type { Reel } from "@/lib/types"

type ReelInfoSheetProps = {
  reel: Reel
}

export function ReelInfoSheet({ reel }: ReelInfoSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Source details"
        className="grid size-11 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-6" />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-0 border-t border-border bg-card pb-4"
      >
        <SheetHeader className="gap-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {reel.category}
          </div>
          <SheetTitle className="text-balance text-xl font-semibold leading-tight tracking-tight text-foreground">
            {reel.sourceTitle}
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed text-muted-foreground">
            {reel.caption}
          </SheetDescription>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="tabular-nums">{reel.durationSec}s reel</span>
          </div>
        </SheetHeader>
        <div className="px-4">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            render={
              <a href={reel.sourceUrl} target="_blank" rel="noreferrer">
                Open source
                <ArrowUpRight className="size-4" />
              </a>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
