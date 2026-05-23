---
name: Better Scroll
description: AI-generated knowledge reels that live inside the user's existing short-form video stream.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Better Scroll

## 1. Overview

**Creative North Star: "The Late-Night Channel"**

Better Scroll is the channel that runs after the entertainment day ends: drenched black canvas, one electric signal cutting through it, type set in a technical sans the way broadcast lower-thirds were in the 90s, motion that is felt rather than performed. The product borrows TikTok's consumption posture, Spotify Wrapped's confidence with bold full-bleed type, and Linear's discipline with restrained motion and a precise grotesque. None of those signal "learning app", and that is the point.

The system rejects every visual cue that would tell a user this is study software. No EdTech greens or mascots. No SaaS dashboards or hero-metric cards. No purple-to-blue AI gradients. No reading-app ergonomics. The reel feed should feel as native and reflexive as the user's other short-form apps; the fact that the content is derived from their saved knowledge is delivered by content alone, never by chrome.

**Key Characteristics:**
- Drenched near-black canvas; the surface IS the color.
- One electric accent, used sparingly, for interaction signal only.
- Single technical sans across the system; no serifs, no display family swaps.
- Restrained motion: state changes feel snappy, but nothing is choreographed.
- Portrait-shaped on every breakpoint, including web.

## 2. Colors

The palette is a near-black canvas with one electric accent and a tight neutral ramp. Color enters the interface primarily through the video itself; chrome stays out of its way.

### Primary
- **Electric Accent** (`[oklch hue family: hot magenta or acid lime; exact value to be resolved during implementation]`): Used for interaction signal only — like states, scrub progress, primary CTAs, the active source filter. Never for chrome, dividers, or backgrounds. Rarity is the entire point.

### Neutral
- **Channel Black** (`[tinted near-black; chroma ~0.005, hue tinted toward the accent; to be resolved during implementation]`): The dominant surface. Reel canvas, app shell, modal scrims. Never `#000`.
- **Signal White** (`[tinted near-white; same chroma rule; to be resolved during implementation]`): Caption text, primary type on dark, key icons. Never `#fff`.
- **Chrome Gray** (`[mid-lightness tinted neutral; to be resolved during implementation]`): Source attribution metadata, timestamps, secondary type, inactive states.

### Named Rules
**The One Signal Rule.** The electric accent occupies ≤5% of any given frame. If two accent-colored elements are visible at the same time, one of them is wrong. Chrome and surfaces are neutral; the accent is reserved for the user's own actions and the system's response to them.

**The Tinted Neutral Rule.** Every neutral, including the deepest black and the brightest white, carries a trace of the accent's hue (chroma 0.005–0.01). Pure `#000` and pure `#fff` are forbidden everywhere.

**The Content Color Rule.** The reel video is allowed to be any color it wants. The chrome around it is not.

## 3. Typography

**Display Font:** A technical / grotesque sans (Inter, Neue Haas Grotesk, GT America, or equivalent — final selection to be resolved during implementation).
**Body Font:** Same family. The system uses one type family across all roles; hierarchy is built from weight and scale, not from family contrast.
**Label/Mono Font:** Optional tabular figures from the same family for timestamps and progress; no separate mono family.

**Character:** Quiet precision. Reads as confident editorial software, not as broadcast television and not as study app. The grotesque resists both the SaaS-friendly humanist sans (Inter Tight, DM Sans) and the EdTech-rounded sans (Nunito, Quicksand) by feel.

### Hierarchy
- **Display** (weight 700, large clamp, line-height 1): Reel captions when they need to occupy the canvas; end-of-drop screens; onboarding moments.
- **Headline** (weight 600, ~28–32px, line-height 1.1): Source title cards, section headers in settings.
- **Title** (weight 600, ~18–20px, line-height 1.2): In-feed source attribution, primary list rows.
- **Body** (weight 400, ~15–16px, line-height 1.5, max 65–75ch): Settings copy, longer descriptions; rare in the feed surface itself.
- **Label** (weight 500, ~12–13px, letter-spacing +0.04em, all caps optional): Timestamps, source-type chips, progress meta.

### Named Rules
**The One Family Rule.** One technical sans, full stop. Adding a second family — serif display, mono accent, anything — is forbidden until the system has shipped and earned a reason.

**The Caption Is The Image Rule.** Full-bleed reel captions are not overlaid type; they are a typographic image. They commit at display weight, hold the frame, and are never softened with text-shadow or scrim halos.

## 4. Elevation

The system is flat. There are no decorative shadows. Depth, when it exists, is conveyed through tonal shifts in neutral surfaces (a slightly lighter tinted-black layered on top of channel black) and through the electric accent's appearance against the canvas.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No drop shadows on cards, modals, or sheets. Layering reads through tonal contrast, not through blur or shadow.

**The No Glassmorphism Rule.** Backdrop-filter blur is forbidden as a default. The only acceptable use is a single, full-screen scrim behind a fully modal sheet, and even that earns its place case-by-case.

## 5. Components

_Components are not yet implemented. Re-run `/impeccable document` after the reel feed and supporting surfaces ship to extract the real component vocabulary. The notes below are seed intent, not normative specs._

Anticipated canonical components:
- **Reel canvas** — full-bleed portrait video, type and controls overlaid, no card, no border.
- **Source attribution chip** — bottom-left of the reel; label-weight type, neutral, never accent.
- **Like / save / scrub controls** — accent-colored on active state only; otherwise neutral signal-white iconography.
- **End-of-drop screen** — display-weight type, drenched black, single accent line; the only place the system permits a deliberately composed moment.
- **Settings rows** — list-style, no cards, no nested containers, body-weight type, dividers via 1px tinted-neutral lines.

## 6. Do's and Don'ts

### Do:
- **Do** keep the canvas at tinted near-black. Every surface inherits `Channel Black`; the reel is the source of color, not the chrome.
- **Do** reserve the electric accent for user actions and the system's direct response to them (likes, scrub, progress, primary CTAs).
- **Do** set every caption in the technical grotesque at display weight when it occupies the frame; treat type as image.
- **Do** lean on tonal contrast and 1px tinted-neutral dividers for structure.
- **Do** keep motion to state changes: quick, snappy, no choreographed entrances or scroll sequences.
- **Do** stay portrait-shaped on web; do not earn extra horizontal real estate just because the breakpoint allows it.

### Don't:
- **Don't** use Duolingo greens, mascots, streaks, XP meters, or any other EdTech signaling. Better Scroll is not learning software.
- **Don't** ship a SaaS dashboard layout: no sidebar + topbar + cards, no navy-and-cyan, no hero-metric stat blocks.
- **Don't** use AI-slop visual cliches: no purple-to-blue gradients, no neural-net iconography, no `✨ AI-powered` badges, no `background-clip: text` gradient headlines.
- **Don't** style the reel surface as a reading app. Pocket / Instapaper / Readwise long-form layouts are forbidden.
- **Don't** introduce streaks, completion percentages, "you learned X today" summaries, or any other self-improvement framing.
- **Don't** use `#000` or `#fff` anywhere. Tinted neutrals only.
- **Don't** use `border-left` greater than 1px as a colored stripe on cards or list items. It is never the right answer; rewrite the element.
- **Don't** use gradient text, decorative drop shadows, or default glassmorphism. All forbidden.
- **Don't** add a second type family. One technical grotesque carries the entire system.
- **Don't** layer two accent-colored elements in the same frame; the One Signal Rule is non-negotiable.
- **Don't** choreograph motion in the MVP. Restrained, state-only motion is the doctrine; revisit only after the system has shipped.
