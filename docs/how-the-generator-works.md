# How the generator works (and why you can trust it)

forgegen is a "black box" in the sense that you drop in a track and a finished
`.funscript` comes out. This page opens the box. You should understand what it
does and why — because trusting an automated scripter is a reasonable thing to
be cautious about, and we'd rather earn it than ask for it.

---

## The short version

A great funscript does two things at once:

- **It uses the whole range.** Strokes go nearly all the way down and nearly
  all the way up — *rail to rail*. Weak auto-tools produce timid little
  wiggles around the middle that feel like nothing.
- **It breathes.** It is busy where the content is intense and sparse where it
  is calm. It rises and settles. It is not a metronome.

forgegen is built to deliver both — and we can *measure* whether it does.

---

## What it actually does

Generation has three jobs, and forgegen separates them cleanly:

### 1. Timing — *when* a stroke happens

forgegen analyses the track's rhythm and locks strokes to it. Every reversal
lands on the music, not on an arbitrary grid. (In a future version, video
motion can supply this timing instead — see below.)

### 2. Depth — *how far* a stroke travels

This is the part most tools get wrong, and it's the heart of why our earlier
output felt flat. **forgegen uses full strokes by default.** It does *not* make
loud moments big and quiet moments small — that approach (which most auto-tools
use, including the old version of this engine) mathematically collapses
everything toward the middle and produces the timid, lifeless feel.

Instead, strokes reach the rails, and *variety comes from elsewhere* (see
density below). A few deliberately gentle passages — teases, breaks — pull back
on purpose, but the default is the full, satisfying stroke.

> We didn't guess this. We measured a hand-authored reference script, found it
> spends ~68 % of its time at the rails, and confirmed the same rule holds
> whether the timing comes from audio *or* from video motion. It's a
> consistent law, not a preference. The technical write-up is
> [`architecture/GENERATION_DEPTH_LAW.md`](../architecture/GENERATION_DEPTH_LAW.md).

### 3. Density — *how busy* it is

This is where the energy of the track goes. Loud, driving sections fire on
more beats; calm sections thin out and breathe. This is what makes a script
feel *alive to the content* rather than mechanical — and it's the right home
for energy, instead of shrinking your strokes.

---

## The knobs you get

Because depth is handled correctly and automatically, you are **not** stuck
fiddling with amplitude sliders trying to keep strokes from clipping past 100
or dying in the middle — the frustrating dance older tools (PythonDancer)
required. Strokes are always in range and always full. That removes the knobs
you used to *fight*, and leaves the ones that actually shape the feel:

| Knob | What it changes | When to reach for it |
|---|---|---|
| **Density** | How busy vs. breathy the script is | Turn down for sensual/slow content; up for high-energy |
| **Tone / arc** | The overall rise-and-settle shape (flat, rising, falling, or auto-from-energy) | Match the narrative arc of the scene |
| **Per-chapter recipes** | Apply different density/tone/source per chapter | Long pieces that change character partway through |
| **Source** | Which part of the audio drives timing (beat, bass, voice, ambient) | Pick what carries the rhythm in your track |
| **Range** *(optional)* | A gentler ceiling than full rail-to-rail | Devices or preferences that want softer motion |

The default settings are chosen to produce a strong, full-range, beat-locked
draft with zero tuning. The knobs are for shaping, not for rescue.

---

## Why you can trust it — even at this early stage

1. **It targets a measured signature, not a vibe.** We have hand-authored
   reference scripts that people love, and a numeric fingerprint of what makes
   them good. forgegen aims at that fingerprint and we check the output against
   it.
2. **The core rule is proven, not tuned.** The "full strokes + timing from the
   signal" rule holds across two completely independent inputs — audio rhythm
   and video motion. That's the mark of something real rather than a fragile
   trick.
3. **Nothing is hidden or locked.** The output is a standard `.funscript`. You
   can open it in any player, see every stroke, and edit it freely in
   FunscriptForge. forgegen gives you a strong starting point; it never traps
   you in its choices.
4. **We're honest about scope.** forgegen listens to the soundtrack — it does
   not (yet) watch the screen. It produces a draft that's coherent with the
   *music*. Where you want strokes timed to a *visual* moment the audio doesn't
   carry, that's a quick edit in FunscriptForge. We tell you where the line is
   instead of pretending there isn't one.

---

## What's still improving

We are honest about being early. The current engine produces the right *kind*
of script — full-range and beat-locked — and we are tuning the balance between
full strokes and the gentler tease/break passages so the texture matches the
best hand-made work even more closely. The foundation (full depth, energy as
density, timing locked to the track) is settled; the refinement continues.

And the same engine is built to accept **video motion** as a timing source in a
future version — so the strokes can follow what's happening on screen, with the
audio shaping intensity. Same engine, one more input.

---

*Want the engineering detail? See
[`architecture/GENERATION_DEPTH_LAW.md`](../architecture/GENERATION_DEPTH_LAW.md)
and [`architecture/funscript-quality-characteristics.md`](../architecture/funscript-quality-characteristics.md).*
