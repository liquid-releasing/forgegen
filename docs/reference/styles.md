# Styles

Styles are presets that set the overall feel of the generated funscript. Each style controls three parameters: the low (trough) position, the high (peak) ceiling, and which part of the audio drives the energy curve.

---

## 🥁 Rhythmic

**Best for:** EDM, electronic, high-energy dance music

| Parameter | Value |
| --- | --- |
| Low | 10 |
| High | 90 |
| Beat source | percussive |

Uses percussive stem separation — voice and melody are stripped out before beat tracking. The result locks tightly to the drum pattern. Drops and kick hits produce the strongest peaks. Good for music with a clear, prominent beat grid.

---

## 🌊 Sensual

**Best for:** Slower tracks, melodic music, R&B, ambient

| Parameter | Value |
| --- | --- |
| Low | 20 |
| High | 75 |
| Beat source | full mix |

Higher low position and lower high ceiling produce a narrower stroke range. The full mix source means voice and melody contribute to the energy curve alongside percussion. The result breathes with the music rather than locking mechanically to the drums. Works well when the vocal or melodic energy is as important as the beat.

---

## ⚡ Intense

**Best for:** Hard EDM, metal, maximum-impact content

| Parameter | Value |
| --- | --- |
| Low | 5 |
| High | 95 |
| Beat source | percussive |

Maximum stroke range. Every beat drives the curve as far as it can go. The percussive source ensures clean beat tracking even on complex, layered tracks. Use this when you want every hit to be felt at full intensity.

---

## 🌪 Chaotic

**Best for:** Complex mixes, live recordings, voice-driven tracks

| Parameter | Value |
| --- | --- |
| Low | 10 |
| High | 90 |
| Beat source | full mix |

The full mix source — without harmonic-percussive separation — means the raw energy of the entire recording drives the curve. Vocals, instruments, percussion, and room ambience all contribute. This produces less predictable, more organic-feeling output. The curve responds to energy shifts that beat-locked styles would ignore.

---

## :wrench: Funscript-Tools

**Best for:**

TBD


---

## Customising beyond presets

Selecting a style sets the starting Low, High, and Beat source values. You can then tune these further on the [Details tab](../ui/details.md) without changing the style label.

If you want a style that sits between presets — for example, Rhythmic intensity with a Sensual stroke range — use the Details tab sliders to dial in exactly what you need, then click **↺ Regenerate**.
