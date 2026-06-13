# ForgeGen UI v0.6 — Design Brief for claude-designer

> **For:** the `claude-designer` agent producing the v0.6 ForgeGen desktop UI.
> **From:** the owner's narration of the intended flow (verbatim intent below)
> + engineering annotations (marked **▶ Claude**) tying each panel to a real,
> shipped engine seam.
> **Product:** ForgeGen — drop in one audio *or* video file, get a finished,
> device-ready funscript. **Audience:** smart artists, not engineers — the UI
> teaches the craft and keeps the user the author of the *story*.
> **Status:** brief, not a spec freeze. The "▶ Claude" notes and the Open
> Questions are meant to be resolved with the owner before pixels are final.

---

## ★ Decisions locked (2026-06-13)

1. **Generation is a *mode inside FunscriptForge*, not a separate app.** The
   owner confirmed: forgegen and FSF are for the **same person at different
   moments** (sometimes generate a draft, sometimes hand-edit). So this brief
   describes a **"New → from audio/video" generation on-ramp at the front of
   FunscriptForge**, after which the user lands in FSF's *existing* surfaces.
   This deliberately **revises** the old "forgegen never edits / FSF never
   generates / clean `.funscript` handoff" architecture — the handoff seam is
   removed; FSF gains a generate front-door.
   - **Reuse, don't rebuild.** Only the **intake → analyze → generate** front-
     door is net-new. Author / preview / export are **FSF's existing tabs**
     (Channels · Passages · Events · Polish · Export) and the shared
     `forgemoment` TrackStack / MediaViewer. Where a panel below overlaps an
     FSF surface, the instruction is *reuse that surface*, not clone it.
2. **Events are authored *while reviewing the video*** (the owner's call —
   "it is a better fit, and we can continue them in FunscriptForge as needed").
   Event authoring moves out of the structural Authoring step and into the
   **Preview / review** panel, where the player is. Rationale below in §4 — it's
   not just ergonomic, it's the right *division of labor*.
3. **Two doors into the same engine: Generate *and* Improve** (the owner's
   insight — *"if we made it a tab in FunscriptForge we can use our underlying
   methods to improve an existing funscript the user already had!"*). Because
   generation now lives inside the editor, the generation *methods* become
   *repair transforms* for scripts the user already owns. See the section below.
4. **The generator is a single entry page, *before* Analyze.** Drop a file →
   "Generate" → the analysis runs **as the owned wait** and the first draft
   falls out as it completes (generation *rides* the analyze pass — one page,
   one wait — rather than adding a second step). The user then lands in the
   existing Analyze/author flow with a draft in hand. *(Generate door and
   Improve door are the two entries on this front page.)*
5. **Passages are the main *authoring* input.** Chapters are the structural
   substrate (auto-detected, editable = *where*); **passages carry character +
   intensity and are the thing the user actively shapes** (= *the craft*,
   propagating to every device); events are instants; the global arc is the
   zero-effort fallback when the user doesn't author passages.

---

## ★ Two doors: Generate *and* Improve

The merge unlocks something bigger than UI reuse: **the generation methods are
also editing superpowers.** The same maths that *makes* a good script can
*fix* a bad one. Two entry points, one engine, the same author surfaces after:

| Door | Input | First step |
|---|---|---|
| **Generate** | a bare audio/video file | analyze → generate the first draft |
| **Improve** | a funscript the user already has (± its source audio) | **diagnose** → offer method-powered transforms |

**Each generation method becomes a transform** (and slots into FSF's existing
transforms framework + Apply):

| Method (proven this work) | As an "Improve" transform |
|---|---|
| **Depth law** (fixed full depth) | **"Fill the rails"** — turn a timid centered-bell script (the #1 amateur failure: little mid-range wiggles) into bimodal, rail-to-rail strokes. |
| **Density arc** | **"Add an arc"** — give a monotone script a build → climax → comedown; or author passages/arc *over* the imported script. |
| **Octave guard** | **"Tame the pace"** — thin a frantic double-time script back to the felt pulse (this is the `tame` transform's basis). |
| **Shaker / device generators** | **"Add a shaker track"** (or any device) from the same source — derive a new modality the user didn't have. |

> **▶ Claude — why this is a real moat, not a feature.** We have a *measured*
> definition of good (the decile shape, the dynamics index — `funscript_stats`)
> AND the operations that move a script toward it. Competitors have vibes. So
> the **diagnose-then-repair** loop is unique: open any script, the editor says
> *"this sits in the mid-range and never reaches the rails; this stretch is
> monotone"* — and offers the one-click transform that fixes it, with a
> before/after on the same `funscript_stats` numbers. This is the dual-purpose
> quality oracle realized (see `architecture/GENERATION_DENSITY_ARC.md` and the
> quality-metrics direction).
>
> **Two power levels, both viable:**
> - **With the source audio** — full strength: re-analyze, regenerate, or blend
>   the user's edits with a fresh generation.
> - **Funscript-only (no audio)** — still works, because *the reversals already
>   are the timing*. Snap their depths to the rails, re-gate density, thin an
>   octave-doubled rate — all operate on the curve itself. **We already proved
>   this**: keeping Funscript-Flow's reversal *times* and snapping to full depth
>   produced clean bimodal (rails 99). The same move repairs any imported script.
>
> **Design implication:** the "Improve" door opens on a **diagnosis** view (the
> `funscript_stats` fingerprint of the loaded script, weak sections flagged),
> then the same Authoring/Preview surfaces as the Generate door — just seeded
> with the user's script instead of a fresh draft.

---

## ★★ The keystone: intent is authored once, and propagates to every device

The owner's framing, and the architectural spine of the whole app:

> *"When a user edits intent, it goes across to the other funscripts as well."*

There are two kinds of thing in this app, and keeping them separate is what
makes everything above work:

- **Intent** (device-agnostic): **chapters · passages + intensity · events ·
  the arc · character / 2D-motion**. This is *the performance* — what happens,
  where, how hard, and *the shape of the motion* (the last facet feeds
  multi-axis devices). It is the **source of truth** and the thing the project
  *saves*.
- **Device funscripts** (derived): the E-Stim channels, the OSSM/OSR stroke
  track, the Shaker track. These are **outputs** of running each device's
  generator over the intent + the audio facet it reads. They are *regenerable*,
  not hand-precious.

So **editing intent re-flows into every device at once.** Drag a passage's
intensity up → the strokes get denser *and* the shaker gets stronger *and* the
e-stim drives harder, together. Move an event → it punches every device on that
frame. The device tabs in Preview are **live views of one intent**, not
separate documents. This is the unified-score model made concrete (see the
unified-score direction): *one modality-agnostic score, per-device generators.*

**Edger's events and characters are part of this intent vocabulary** (owner's
point) — and each device generator may interpret a given event/character
**differently**: an *edge* holds the strokes and eases the e-stim while the
shaker drops out; an *accent* punches all three in their own idiom. The named
intent is shared; the per-device rendering is not. (FSF's Events tab already
carries the edger catalog with per-device profiles — reuse it; this is the same
idea generalized to every generator.)

> **▶ Claude — the operational win the owner named: "we aren't handing off 25
> funscripts in the middle of creating and editing."** A full project is *many*
> derived files — 9 e-stim channels, 6 SR6 axes, the OSSM stroke, the shaker,
> … easily 20+. In the old two-app, clean-handoff world you'd export and shuttle
> that whole pile mid-process and try to keep it in sync by hand — brutal. With
> intent as the single source of truth, **you only ever edit the one intent; the
> 20+ device files are regenerated from it, and only materialized at Output.**
> Nobody hand-carries 25 funscripts through the edit loop. *That* is what the
> merge buys operationally — not just shared widgets, but the elimination of the
> derived-artifact-juggling that made multi-device authoring intractable.

> **▶ Claude — this is the cleanest possible architecture *and* it has one hard
> part; name it now.** The clean part: the **intent layer is the document**
> (saved as sidecars — chapters.json, passages, events/`feel.yml`, arc params);
> the device funscripts are build artifacts the `.forge` bundle also carries.
> Regeneration is cheap and total — edit intent, everything downstream rebuilds.
>
> **The hard part — manual per-device edits.** A user will eventually hand-tweak
> *one* device's curve directly (nudge a single OSSM stroke), which is *not*
> intent — it's a device-local override. If intent then regenerates, does it
> clobber that tweak? The reconciliation policy (this is exactly FSF's
> accept/chain + working-funscript territory, already partly built):
> - **Intent edits regenerate freely** — the default, lossless path.
> - **A device-local manual edit is a layered override** on top of the
>   generated curve, re-applied after regeneration where it still fits — or, if
>   the user wants to go fully bespoke, they **"detach"** that device's track
>   from intent and own it by hand (it stops auto-updating). Surface the
>   detached state clearly so the user knows that device no longer follows intent.
>
> Get the *propagation* (intent → all devices, live) right for v1; the override/
> detach reconciliation can land just behind it, reusing the accept/chain work.

---

## ★ Resolved flow: two analyses, the door split, and the source preview

*(2026-06-13 — resolves the before/after-Generate ordering tension.)*

**There are two different "analyses," and they live in different places:**
- **Audio/video analysis** (beats · energy · bass · spectrogram · scene-cuts)
  is *input* analysis the generator needs → it runs **inside Generate as the
  owned wait**, not as a separate user step. **Chapters fall out of it.**
- **Motion/funscript analysis** (phrases · the decile/dynamics diagnosis)
  analyzes *the script*, so it runs **after** a funscript exists.

So "analyze before or after Generate?" — **audio analysis is before** (fused
into Generate); **phrase/motion analysis is after** (on the result). Same word,
two jobs.

**The flow bifurcates at Project, by door:**
- **Generate door (no funscript yet):** Library → Project *(shows the **source
  preview**, not an empty funscript)* → **Generate** *(audio analysis runs as
  the wait → chapters auto-appear → a default-arc draft drops out)* → **author**
  *(edit chapters, assign passage intensities → live-regenerates; events while
  watching; density profile)* → **phrases** → rest of FSF.
- **Improve door (funscript present):** Library → Project *(shows the funscript
  + its diagnosis)* → author → phrases → rest of FSF. No Generate; the methods
  are transforms.

**The dependency that orders chapters / passages / phrases:** passages are runs
of chapters, so chapters must exist first (they come from the audio analysis).
But because **intent regenerates cheaply** (the keystone), you do **not** author
passages *before* generating — the first draft uses the **default arc** (zero
authoring), then you assign passages and it **live-regenerates**. So: *chapters
first (from analysis-in-Generate) → passages authored on top (live-regen) →
phrases after.*

### The source preview — what fills the Project panel pre-generation

Don't show an empty funscript chart or a grey placeholder; show **what we have
and what we're learning**, on the *same timeline the funscript will use*, so
Generate visibly fills in the missing layer. It's the shared `forgemoment`
TrackStack populated with **source lanes** instead of a funscript line, filling
**progressively as the analysis-in-Generate runs** (the wait IS the reveal):

- **Video poster frame / filmstrip + scrubber** *(video files)* — the artist
  wants to see the screen.
- **Waveform** *(always)* — the amplitude envelope.
- **Beat grid + detected BPM** — ticks appear once beat-tracking lands
  (octave-corrected, so the tempo shown is the *felt* one).
- **Energy envelope** — loudness / intensity over time.
- **Spectrogram lane, with the bass band highlighted** — the bass band *is* the
  shaker's input signal, so this previews what the shaker will follow.
- **Scene-cut markers** *(video)* — which feed chapter detection.
- **Chapter blocks** — drawn on the timeline once segmented (editable there).
- **File facts** — duration, format, sample rate.

After Generate, the funscript line(s) drop into the **same** panel, overlaid on
the waveform. One slot, progressively filled: **source → +beats → +chapters →
+funscript.**

---

## 0. The spine — a linear pathway

The product is a **numbered pathway** (the existing shell): the user moves
left-to-right through stages, each gated by the last. One file in at the start;
a bundle out at the end.

```
Intake ──▶ Analysis ──▶ Authoring ──▶ Preview ──▶ Output
(works)    (the wait)   (the craft)   (the proof)  (the deliverable)
```

> **▶ Claude — keep the pathway, but name the stages for the *artist's* mental
> model, not ours.** A musician/editor thinks: *load it → let it listen →
> shape the performance → watch it → save it.* Those five verbs are the five
> panels. Resist adding a sixth; every extra gate costs a drop-off.

---

## 1. Intake — Library / Project / Workflow *(works today — keep)*

The owner's read: **"the library, project, workflow works."** One file is
uploaded — **either an audio file or a video file** — then *go to the next
panel.*

> **▶ Claude — no change needed.** One decision to surface cleanly: the file is
> *audio* or *video*, and that choice changes what Analysis can do (below).
> Detect it and carry an `isVideo` flag forward; the Analysis panel adapts.

---

## 2. Analysis — *the owned wait*

The owner's read: **"that is where we take our time and extract the wav file
from the mp4 and while the user waits, slowly build what we know about the
file. We analyze the video if it is a video file we uploaded."**

This is the **one place we are allowed to be slow**, because the user expects
it (they pressed *Analyze*). Spend the wait *visibly* — reveal what we learn as
we learn it, so the bar is never a blank spinner.

**What runs here (all real engine work today):**
- Extract audio (WAV) from the file — for video, demux the audio track.
  *(The temp WAV is written to a swept `forge-audio` dir and cleaned up — the
  release gateway; the UI never sees it.)*
- **Beat & tempo** via `analyze_beats` — with the **octave guard** that folds a
  doubled tempo back to the felt pulse (so the pace isn't frantic).
- **Energy envelope, onsets, spectrogram** — the material for the lanes.
- **Chapter detection** — segment the piece into sections.

**Progressive reveal (design the wait as a reveal, not a spinner):**
duration → waveform → BPM/pulse → beat grid ticking in → spectrogram lane →
chapters resolving into blocks. Each lands as it computes.

### The owner's questions, answered

> **"Is analyzing the video the right move?"**
>
> **▶ Claude — partly. Audio is the spine; video is an *aid*, not the driver
> (yet).** v1 generation is **audio-driven**: beats supply timing, and the
> depth/density laws do the rest. So in Analysis: **always extract and analyze
> the audio**, video or not. For a *video* file, **additionally run cheap
> scene-cut detection** — scene cuts are excellent chapter-boundary hints. What
> we do **not** do in v1 is full optical-flow motion CV (that's the external
> **Funscript-Flow** path — expensive, deferred; see
> `architecture/VIDEO_VIA_EXTERNAL_GENERATOR.md`). So: *audio always; video
> scene-cuts to sharpen chapters; full video-timing later.* Show the video
> thumbnail/scrubber in the UI regardless — the artist wants to see the screen.

> **"Do we divide it into chapters there? If so, we show the user the chapters
> and allow the user to make changes."**
>
> **▶ Claude — yes, exactly, and this is the right home for it.** Chapters are
> computed in the wait (audio structure + scene cuts if video), then shown as
> editable blocks on the timeline. The user can **split / merge / nudge
> boundaries** and rename. *Chapter editing is the bridge into Authoring —* the
> arc and passages are authored *on top of* these chapters, so they must be
> correct (or correctable) before moving on. Auto-detection gets it ~right;
> manual correction is a first-class affordance, not a fallback.
>
> *Engine note:* `auto_chapter()` exists and writes a sidecar; better
> *audio-informed* chapter selection is a deferred data-mining refinement (the
> owner's call) — it improves detection, it does **not** block this panel.

---

## 3. Authoring — *the craft* (chapters → passages → arc → events)

The owner's read: **"in the work after of that, we have the user select what we
called passages. Is there something else there?"**

> **▶ Claude — yes: there are *three* authoring layers plus one global control.
> Keeping them distinct is the whole game.** This is where the dynamic-density
> work from the engine surfaces, so it's worth being precise:
>
> | Layer | Question it answers | Engine seam |
> |---|---|---|
> | **Chapters** | *Where* are the sections? (structure) | `auto_chapter` + user edits |
> | **Passages** | *How hard* does each run drive? (character + intensity) | per-chapter `intensity` → the density arc |
> | **Events** | *What happens at this instant?* (edges / accents / climax) | point markers (optional in v1) |
> | **Arc (global)** | The overall build → climax → comedown shape, if the user doesn't want to hand-author every passage | `density_arc_curve` knobs |
>
> **Passages are the heart of this panel** — a run of chapters sharing a
> character and an **intensity**. Intensity is not cosmetic: it *drives the
> density arc* (a calm passage thins to a sparse rest; a peak passage
> subdivides toward a climax). This is the same gesture as **passages in
> FunscriptForge** — the user marks the stretches and says how hard each one
> drives. We just proved (on two reference scripts) that this author-declared
> intensity contour — **not** audio loudness — is what makes a script feel
> *performed* rather than mechanical (see `architecture/GENERATION_DENSITY_ARC.md`).
>
> **The "global Arc" is the zero-effort path:** a user who doesn't want to
> author passages gets a sensible **build-in / body / late-climax / comedown**
> curve by default, exposed as 2–3 friendly controls (a *shape preset* + a
> *how-strong* dial), not seven raw sliders. Passages, when present, override
> the global arc locally.
>
> **Events are optional for v1** — design a place for point markers (edge /
> accent / climax) but it's acceptable to ship Authoring with Chapters +
> Passages + Arc first and add Events next. Flag it as a stub, don't block on it.

> **▶ Claude — one naming caution for the designer:** *"passage"* is overloaded
> across the family (it means a generic editing-grouping noun in some docs and
> this character/intensity span here). Pick **one** label in the UI and stick
> to it. Recommend **"Passages"** for the character+intensity spans (matches
> FSF), and reserve **"Chapters"** strictly for structural segments.

---

## 4. Preview — *the proof* (one or more funscripts + a player)

The owner's read: **"then click go to the next tab where we display the
funscript. (I can imagine since we are developing for estim, we can also
provide for others — shaker might want a different one, or mechanical or haptic
a different one.) This is where we show them one or more of the funscripts. We
show one of our complex funscript panels with some selected panels with a
player."**

> **▶ Claude — refine the model (the owner's insight): it is NOT "one score,
> many renderers." It is "one shared *analysis*, many device-specific
> *generators*."** Different devices want genuinely *different funscripts*, not
> re-skins of one curve. Three distinct generator *kinds*:
>
> - **1-axis stroke** (E-Stim primary channel · Handy · OSR2 · **OSSM** linear
>   stroker) — generated from **beats + the depth law + the density arc**. A
>   single position-over-time curve. These share a stroke score and differ only
>   in rendering (channel map, stroke-range + speed mapping). Here "one score,
>   many renderers" *does* hold.
> - **Multi-axis** (**SR6** — 6 axes; OSR2 partial) — generated from the
>   **character / 2D-motion** intent facet, not just the 1-axis stroke. Surge /
>   sway / twist / roll / pitch carry the *shape* of the motion (TCode L0/L1/L2/
>   R0/R1/R2). This is a richer generator that reads the Character layer (FSF's
>   `characters.js` / `multiaxis.js` work) — *different output, same intent.*
> - **E-Stim multi-channel** — alpha/beta/frequency/pulse_* (a generator family
>   of its own; FSF's Channels/Polish already produces these).
>
> > **▶ Claude — OSSM (the owner now has one) is the validation device the
> > project has been missing.** It's a real physical linear stroker, so it
> > proves what deciles only *measure*: a centered-bell script makes timid
> > little movements; the bimodal full-depth script makes *full strokes* you
> > feel. The dogfood loop finally closes — generate → play on OSSM → feel →
> > refine. It also **physically enforces** two things we derived on paper:
> > (a) the **depth↔rate coupling** — a stepper *cannot* slam full strokes at
> > 9/s (speed/accel limits), so "fast = smaller strokes" isn't a stylistic
> > choice, it's mechanics; and (b) the **device-clamp / Polish layer** — the
> > generated curve must be clamped to OSSM's stroke range and max speed before
> > it's safe/playable. OSSM is where the Polish station earns its keep.
> > Integration is standard: position-over-time funscript → OSSM's stroke range
> > + speed limits (via its firmware / Intiface / buttplug). With **SR6 also on
> > the way** (multi-axis), the device lab will validate all three generator
> > kinds on real hardware — 1-axis (OSSM), multi-axis (SR6), e-stim (restim) —
> > turning the deciles/dynamics *numbers* into *felt* validation. That's the
> > loop the project has been missing: numbers prove shape, devices prove feel.
> - **Shaker / tactile transducer** — a **different generator entirely**:
>   driven by the **bass-energy envelope**, continuous, smooth, NOT rail-to-
>   rail. *(Owner's call: stand up the shaker FIRST as v1's device — see the
>   shaker note below.)*
> - **(future)** other facets — a vocal/treble-driven device, etc.
>
> **The unifying thread is the authored arc, not the base signal.** Chapters /
> passages / events / the arc are device-agnostic *intent*; each generator
> reads that intent and the audio facet it cares about. So a calm passage
> thins the strokes **and** lowers the shake; a climax does both. The human
> authors intent once; every device's generator honors it.
>
> Design a **device selector** (tabs) above the funscript panel; **v1 ships the
> Shaker live**, with the stroke family as the second tab. The layout must
> assume multiple, visibly-different funscripts.
>
> ### The Shaker generator *(net-new — owner wants to prototype + try)*
>
> > **▶ Claude — the shaker INVERTS the depth law, and that's the elegant part.**
> > For strokes we proved you must *not* map signal→amplitude (that makes a
> > mushy bell). A shaker is the opposite: it's a vibration *intensity* over
> > time, so mapping signal→amplitude is exactly right — the "energy model" we
> > deliberately abandoned for strokes is the shaker's *natural* basis (the
> > legacy `depth_model="energy"` we kept for back-compat is literally this).
> >
> > **First-cut algorithm to try** (we have all the DSP in `videoflow.audio`):
> > 1. **Isolate the bass** — low/sub-bass band (≈ 30–150 Hz) via bandpass, or a
> >    low-band RMS. *(The body feels what the shaker reproduces — matching the
> >    bass is intuitive.)*
> > 2. **Envelope** — short-window RMS (~20–40 ms hop) → energy-over-time.
> > 3. **Normalize track-relative** — rolling/global 95th-pct → 100 (the same
> >    rolling-normalization trick we borrowed from Funscript-Flow).
> > 4. **Attack/release smoothing** — fast attack to *catch the kick*, slower
> >    release so it doesn't chatter → it "hits" on the bass and decays.
> > 5. **Emit dense** — pos = intensity 0–100 at ~30–60 Hz (a smooth, continuous
> >    funscript, unlike the sparse stroke script).
> > 6. **Scale by the authored arc/passage intensity** — so the shake follows
> >    the same story.
> >
> > **Knobs to expose for trying:** *band* (sub vs full bass), *punch* (transient
> > emphasis = attack/release + onset weight: drone↔kick-punch), *floor* (idle
> > level). Ship a sane default; the owner will dogfood and the *body* decides —
> > don't over-engineer the first algorithm. Engine-wise this is a new
> > `generate_shaker()` in `videoflow.generate` (bandpass → envelope → smooth →
> > dense funscript); tractable, reuses existing analysis.
>
> **The funscript panel** = reuse the **forgemoment TrackStack / MediaViewer**
> (lane stack: funscript line + audio waveform + beat ticks + spectrogram +
> events), windowed to the active chapter, with a **player** (video if we have
> it) and a beat-locked playhead. *For the shaker, the relevant lane is the
> bass envelope, not the beat grid* — the lanes shown should match the device.
>
> **Add the density-profile lane** — `funscript_stats.windowed_profile`. *This
> is the artist's feedback loop:* it draws the **arc they authored** as a
> visible shape, so the Passages/Arc knobs feel honest, not magic. (For the
> shaker, the equivalent is the intensity envelope.)
>
> ### Author **Events** here, while watching the video *(owner's decision)*
>
> > **▶ Claude — this is the right home, and not just ergonomically.** Events
> > (edge / accent / climax / scene-accent) are *responses to on-screen action*
> > — the visual narrative the audio analysis literally cannot see (the
> > coherence-with-content limit). **The human watching the video IS the
> > video-coherence layer.** So authoring events at the review moment is exactly
> > where the person adds the value the machine can't: scrub/play the video,
> > drop an event on the frame that matters, see it land on the funscript lane.
> > Reuse FSF's **Events** authoring loop (the edger catalog, the durable
> > `.feel.yml` write-through) — surfaced here against the player. Events
> > authored here **continue seamlessly in FunscriptForge** (same surface, one
> > app — that's the merge paying off). Marked events also feed every device
> > generator (an accent punches the shaker and the strokes alike).

---

## 5. Output — *the deliverable*

The owner's read: **"the user goes to the next panel where we output, save the
funscript and bundle the sidecars we created, maybe even output a beat.mp3 file
that you have seen."**

> **▶ Claude — all real and mostly already built (reuse FSF's packager):**
> - **Funscript(s)** — the selected device renderings (the e-stim channels are
>   multiple files; mechanical/haptic are single).
> - **The `.forge` bundle** — motion + stamped device files + events.yml +
>   sidecars (chapters, phrases/passages, feel) + thumbnails + a provenance
>   `manifest`. This packager exists in FunscriptForge; reuse it, don't rebuild.
> - **`beat.mp3` (optional export)** — the isolated beat track. Genuinely
>   useful: it's the timing signal other tools (restim, live performers) can
>   drive from, and it's a satisfying "here's what we heard" artifact. Offer it
>   as a checkbox, off by default (it's an extra encode).
> - **Reveal / open-in-player** after write, like the FSF export flow.

---

## Design system & shell

- **Pathway shell**, numbered stages, **FunscriptForge red accent on dark**
  (consistent with `ui.md` and the v0.4/v0.5 handoffs).
- **Reuse** the forgemoment `TrackStack` / `MediaViewer` for every funscript/
  lane visualization — do not invent a second chart.
- **Progressive-reveal Analysis** and **density-profile preview** are the two
  novel, high-value UX moments — budget design attention there.
- The arc/passage controls should feel like a **mixing console / arrangement
  view**, not a settings form.

---

## What the engine guarantees (seams the design can rely on **today**)

| UI need | Engine seam (shipped) |
|---|---|
| Beat/tempo, octave-corrected | `videoflow.audio.analyze_beats` (`_correct_tempo_octave`) |
| Energy / spectrogram / waveform lanes | `analyze_beats` energy + `videoflow.audio` peaks/spectrogram |
| Chapter segmentation (+ sidecar) | `videoflow.chapters` / `auto_chapter` |
| Global arc (build/body/climax/comedown) | `generate.density_arc_curve` (tunable knobs) |
| Per-passage intensity → arc | `generate_from_beats_per_chapter` recipe `intensity` |
| Generate funscript (arc on by default) | `generate_from_beats(density_arc="default")` / CLI `--density-arc` |
| Density-profile preview lane | `funscript_stats.windowed_profile` / `dynamics_index` |
| Bundle + sidecars + manifest | FunscriptForge `.forge` packager (reuse) |
| Beat-track / sidecars | analysis sidecars; `beat.mp3` = extra encode of the isolated beat |

*Not yet built (don't design as if live): full video-motion CV (Funscript-Flow,
deferred), Events authoring (stub OK for v1), multi-device renderers beyond
e-stim (layout for them; ship e-stim live).*

---

## Open questions to resolve with the owner before final design

1. **Device families in v1 Preview** — E-Stim only live, with Mechanical/Haptic
   as "coming" tabs? Or stand up one mechanical (OSR/TCode) renderer too?
2. **Arc control surface** — ship the *global Arc* as **presets + one dial**
   (recommended for artists) and treat raw knobs (build/taper/peak position/
   width) as an "advanced" disclosure? Or expose all knobs?
3. **Events in v1** — author point events (edge/accent/climax) now, or ship
   Authoring as Chapters + Passages + Arc and add Events next?
4. **Passages vs Chapters vocabulary** — confirm the two labels and that
   "passage" means the character+intensity span (not a generic grouping).
5. **Video in Preview** — when the input is video, do we play the video behind
   the funscript lanes in Preview? (Recommend yes — it's the artist's reference.)
6. **Chapter editing depth** — boundary nudge + split/merge + rename is the v1
   set; is per-chapter *source* (percussive vs full mix) also an artist-facing
   control or an advanced one?

---

## One-paragraph summary for the designer

ForgeGen is a five-stage pathway: **load** one audio/video file → let it
**analyze** (the owned wait: extract audio, beat-track with octave correction,
build energy/spectrogram lanes, and segment editable chapters) → **author** the
performance (edit chapters; assign Passages with a character and an *intensity*
that drives the density arc; or just accept a sensible global build→climax→
comedown Arc; Events optional) → **preview** the result as one or more
device-specific funscripts in the shared lane-stack player, with a *density
profile* that draws the authored arc back to the artist → **output** the
funscript(s), the `.forge` bundle of sidecars, and an optional beat.mp3. The
craft (full strokes, locked to the real beat, a real narrative arc) is the
machine's job; the *story* stays the artist's.
