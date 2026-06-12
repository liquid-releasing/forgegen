# ForgeGen v3 — User Guide

ForgeGen turns your audio or video into a **funscript** (a haptic motion track). v3's headline
feature lets you blend **two sources** of motion — ForgeGen's audio engine and a
**video** (computer-vision) track — choosing the better one **per chapter**.

Open `ForgeGen v3 (standalone).html` in any modern browser. Nothing to install.

---

## The pipeline at a glance
A row of stages runs left → right across the top. Each stage has an **Accept** bar at the
bottom; accepting unlocks the next stage.

**Project → Analysis → Sources → Recipes → Generate → Output**

> Tip: press **1–6** to jump between unlocked stages, **⌘Z / ⌘⇧Z** to undo/redo, and
> **⌘K** to toggle the Tweaks panel.

---

## 1 · Project
Click **Load sample project** to try the built-in Big Buck Bunny benchmark (7 chapters,
9:55), or drop your own media. Once loaded you'll see two **"Add another source"** cards:

- **Analyze video motion** — runs the bundled video generator to create a second candidate
  track (see Sources). This is optional and runs as a one-time pass.
- **Import a .funscript** — bring in an existing hand/AI script as a candidate source.

You can start either here or later on the Sources stage. Click **Accept and continue**.

## 2 · Analysis
A read-only review of what ForgeGen detected — chapters, phrases, beats, energy. Nothing to
edit; just confirm the structure looks right and continue.

## 3 · Sources ⭐ (new in v3)
This is where you choose **where each chapter's motion comes from**.

- If you haven't run it yet, click **Analyze video motion** in the blue banner. After a
  short pass, every chapter gets a **Video CV** candidate alongside the **Audio-synth** one.
- The **source-mix ribbon** shows your whole track colored by source (red = audio,
  blue = video, purple = imported). Dashed gold marks are **seams** — boundaries where the
  source changes; ForgeGen blends these automatically.
- Each chapter has a **compare card** with the candidates side by side:
  - A **mini curve** preview of each candidate
  - A **confidence %** and a one-line reason (e.g. *"optical flow locks on"* vs
    *"no clear beat grid"*)
  - A **SUGGESTED** badge on the higher-confidence source
  - **Click a panel to choose** that source for the chapter.
- Use the bulk buttons to **Use suggested**, **All audio**, or **All video** at once.
- The right-hand **inspector** shows the focused chapter's confidence comparison and a note
  on what gets passed downstream.

**Why per chapter?** Video tracking is great on clear, sustained action but noisy on cuts,
scenery, or dark scenes — while the audio engine is reliable on rhythmic sections but
generic on quiet ones. Per-chapter selection lets you route each section to whichever
source is stronger. (In the sample, the two climaxes favor video; everything else favors
audio.)

Click **Lock sources and continue**.

## 4 · Recipes
Per-chapter shaping. For **audio** chapters you get the **influence mix** (Beat / Bass /
Voice / Ambient on a draggable radar) plus recipe knobs (style, density, shape). For
**video** or **imported** chapters the radar is greyed out — the motion is already a
finished track — and you'll see its tracking quality instead. The recipe knobs still apply
as post-shaping. Save and continue.

## 5 · Generate
Press **Forge funscript**. ForgeGen pulls each chapter from the source you chose, shapes it,
**blends the seams** at the boundaries, and stitches one funscript. A sweep animation lights
each chapter as it's forged; the summary reports your source mix and seam count.

## 6 · Output
Inspect the final curve, scrub through chapters, and review the **per-chapter breakdown**
(now with a **Source** column so you can see which engine produced each section).

- **Export targets**: funscript, beat-track audio, haptic script, and the **forge metadata**
  sidecar — which carries the per-chapter source so downstream tools (FunscriptForge) know
  which chapters came from video.
- **Open in FunscriptForge** hands off the funscript + sidecar for fine editing.
- **Tweaks panel** (⌘K): toggle the output between **Multi-source** (your selection) and
  **Audio only** (the all-audio baseline) to hear/see exactly what the video pass added.

---

## Quick FAQ
- **Do I have to use video?** No. Audio always runs and is the default; video is opt-in. If
  you never analyze video, ForgeGen behaves like v2 (audio-only).
- **What's a seam?** A chapter boundary where the source switches. ForgeGen smooths the
  transition so the device doesn't get a jump.
- **Can I mix audio and video within one chapter?** Not in v3 — selection is per chapter.
  (A blended "video timing + audio intensity" mode is planned for later.)
- **Imported scripts** become a third candidate on every chapter, chosen the same way.
