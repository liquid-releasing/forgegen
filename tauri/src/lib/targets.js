// Target device presets for forgegen Generate.
//
// Each target provides:
//   - recommendedDensity: filled into Track Defaults when the target is picked
//   - maxSafeDensity:     densities above this earn a ⚠ headroom warning
//
// Density ordinal: 'half' < '1' < '2' < '4' < '8'
//
// Replacing the Device tab — funscript output stays one format; what
// "device" really meant was "what stroke density does my toy comfortably
// sustain?", which fits inline with the Generate authoring step instead of
// being its own page. Multi-output (funscript + bhaptics + multi-axis from
// one recipe) lives in the Output tab when we add it.

export const TARGETS = [
  {
    id: 'handy',
    label: 'The Handy',
    summary: 'Stays within the Handy\'s comfortable sustained cadence.',
    recommendedDensity: '1',
    maxSafeDensity: '1',
  },
  {
    id: 'keon',
    label: 'Kiiroo Keon',
    summary: 'Canonical PD-style — one stroke per beat.',
    recommendedDensity: '1',
    maxSafeDensity: '2',
  },
  {
    id: 'osr2',
    label: 'OSR2 / SR6',
    summary: 'Servo-driven — can handle dense scripts and short bursts.',
    recommendedDensity: '2',
    maxSafeDensity: '4',
  },
  {
    id: 'custom',
    label: 'Custom — no headroom check',
    summary: 'No density ceiling. For unknown / mixed devices.',
    recommendedDensity: null,
    maxSafeDensity: null,
  },
];

const DENSITY_ORDINAL = { half: 0, full: 1, '1': 1, '2': 2, '4': 3, '8': 4 };

export function getTarget(id) {
  return TARGETS.find((t) => t.id === id) || TARGETS[0];
}

/** True if the given density exceeds the target's maxSafeDensity. */
export function exceedsHeadroom(target, density) {
  if (!target?.maxSafeDensity) return false;
  const rank = DENSITY_ORDINAL[density];
  const cap = DENSITY_ORDINAL[target.maxSafeDensity];
  if (rank == null || cap == null) return false;
  return rank > cap;
}
