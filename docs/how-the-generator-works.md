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
- **It tells a story.** It starts sparse, builds, peaks, and eases off — it has
  a shape over time, not one flat setting. It is not a metronome.

forgegen is built to deliver both — and we can *measure* whether it does.

---

## What it actually does

Generation has three jobs, and forgegen separates them cleanly:

### 1. Timing — *when* a stroke happens

forgegen analyses the track's rhythm and locks strokes to it. Every reversal
lands on the music, not on an arbitrary grid. (In a future version, video
motion can supply this timing instead — see below.)

One subtlety we handle for you: music can fool a rhythm detector into counting
*double-time* — tapping on every half-beat instead of the beat you actually
feel. Left alone, that makes a script feel frantic, twice as busy as it should
be. forgegen detects this and folds the pace back to the pulse you'd nod your
head to, keeping the strongest beats. The result is a script that moves at the
scene's real tempo, not a caffeinated version of it.

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

### 3. Density and shape — *how busy* it is, and how that **changes over the scene**

If depth is the size of each stroke, density is *how often* the strokes come —
and the most important thing we learned is that the great scripts don't hold
one density the whole way through. They have a **shape**: they start sparse,
build, push hardest near the peak, and ease off at the end. A flat wall of
strokes — even full, perfectly-timed ones — feels mechanical. The *shape* is
what makes it feel performed.

Here's the part that surprised us, and it's worth knowing as an artist:
**that shape does not come from how loud the music is.** We compared a beloved
hand-made script against its soundtrack and found almost no connection between
the volume and where the script got busy or calm. The clincher: at the very
end, the music was still pounding while the script had deliberately *wound
down* to a finish. The author wasn't following the track's volume — they were
telling a story, and the volume of a song is not the story of a scene.

So forgegen doesn't let the loudness knob decide how intense your script
feels. Instead it lays down a natural arc — a gentle build-in, a fuller body,
a lift near the climax, and a comedown at the end — and lets *you* shape it.
You can keep the sensible default, adjust its shape, or set the intensity
**section by section** — telling forgegen "this chapter is a slow tease, this
one is the peak." If you've used **passages in FunscriptForge**, it's the same
idea: you mark the stretches and say how hard each one drives.

That's the philosophy in one line: **the machine handles the craft — full
strokes, locked to the beat — and you keep authorship of the story.**

---

## The knobs you get

Because depth is handled correctly and automatically, you are **not** stuck
fiddling with amplitude sliders trying to keep strokes from clipping past 100
or dying in the middle — the frustrating dance older tools (PythonDancer)
required. Strokes are always in range and always full. That removes the knobs
you used to *fight*, and leaves the ones that actually shape the feel:

| Knob | What it changes | When to reach for it |
|---|---|---|
| **Arc** | The overall shape over the whole piece — how strong the build-in, where the climax sits, how long the comedown | Set the storytelling shape of the scene in one gesture |
| **Chapter intensity** | How hard each individual section drives (like assigning a passage its character) | A piece that moves through distinct moods — tease, build, peak, cool-down |
| **Density** | The baseline busy-vs-breathy level | Turn down for sensual/slow content; up for high-energy |
| **Source** | Which part of the audio drives timing (beat, bass, voice, ambient) | Pick what carries the rhythm in your track |
| **Range** *(optional)* | A gentler ceiling than full rail-to-rail | Devices or preferences that want softer motion |

The default settings are chosen to produce a strong, full-range, beat-locked
draft *with a natural arc* and zero tuning. The knobs are for shaping the
story, not for rescuing the mechanics.

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
of script — full-range, beat-locked, and with a real build-and-release arc —
and we are still tuning two things: the balance between full strokes and the
gentler tease/break passages (so the texture matches the best hand-made work),
and the default arc shapes for different kinds of content. The foundation —
full depth, density as a story arc you control, timing locked to the track's
real pulse — is settled; the refinement continues.

And the same engine is built to accept **video motion** as a timing source in a
future version — so the strokes can follow what's happening on screen, with the
audio shaping intensity. Same engine, one more input.

---

*Want the engineering detail? See
[`architecture/GENERATION_DEPTH_LAW.md`](../architecture/GENERATION_DEPTH_LAW.md)
(full strokes),
[`architecture/GENERATION_DENSITY_ARC.md`](../architecture/GENERATION_DENSITY_ARC.md)
(the story arc), and
[`architecture/funscript-quality-characteristics.md`](../architecture/funscript-quality-characteristics.md).*
