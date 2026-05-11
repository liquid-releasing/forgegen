// Stepper — horizontal pipeline progress indicator.
//
// Designed to be reusable across forgegen for any multi-stage operation
// where the user benefits from seeing both *where we are* and *what's
// ahead*. First consumer: Project tab's auto-chapter run. Second use
// will be Generate's funscript synthesis.
//
// Visual: dot — line — dot — line — dot, with one row of labels below.
// State per dot: completed (filled) / current (pulsing accent) / pending
// (outline). Below the strip, optional `detail` line surfaces the
// freshest sub-stage label so users see the actual videoflow output too.

const DOT_SIZE = 12;
const COLOR_DONE = 'var(--accent)';
const COLOR_PENDING = 'var(--border)';

function Dot({ state }) {
  if (state === 'current') {
    return (
      <span
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          background: COLOR_DONE,
          boxShadow: `0 0 0 4px color-mix(in srgb, ${COLOR_DONE} 30%, transparent)`,
          animation: 'pulse 1.2s ease-in-out infinite',
          flex: '0 0 auto',
        }}
      />
    );
  }
  if (state === 'done') {
    return (
      <span
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          background: COLOR_DONE,
          flex: '0 0 auto',
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: '50%',
        background: 'transparent',
        border: `2px solid ${COLOR_PENDING}`,
        flex: '0 0 auto',
      }}
    />
  );
}

function Connector({ state }) {
  return (
    <span
      style={{
        flex: 1,
        height: 2,
        background: state === 'done' ? COLOR_DONE : COLOR_PENDING,
        margin: '0 4px',
        borderRadius: 1,
        opacity: state === 'done' ? 1 : 0.5,
      }}
    />
  );
}

/** Resolve dot state per stage:
 *  - All stages strictly before currentIdx → done
 *  - The current stage → current
 *  - All after → pending
 *  - If currentIdx === -1 (nothing started) → all pending
 *  - If currentIdx >= stages.length (all done) → all done
 */
function dotState(idx, currentIdx, total) {
  if (currentIdx < 0) return 'pending';
  if (currentIdx >= total) return 'done';
  if (idx < currentIdx) return 'done';
  if (idx === currentIdx) return 'current';
  return 'pending';
}

export default function Stepper({ stages, currentStageId, detail, allDone = false }) {
  const total = stages.length;
  const currentIdx = allDone
    ? total
    : currentStageId
    ? stages.findIndex((s) => s.id === currentStageId)
    : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Dot row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
        {stages.map((s, i) => {
          const state = dotState(i, currentIdx, total);
          return (
            <span
              key={s.id}
              style={{ display: 'contents' }}
            >
              <Dot state={state} />
              {i < total - 1 && (
                <Connector state={i < currentIdx ? 'done' : 'pending'} />
              )}
            </span>
          );
        })}
      </div>
      {/* Label row — aligned under each dot via flex */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {stages.map((s, i) => {
          const state = dotState(i, currentIdx, total);
          return (
            <span
              key={s.id}
              style={{ display: 'contents' }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color:
                    state === 'current'
                      ? 'var(--accent)'
                      : state === 'done'
                      ? 'var(--fg)'
                      : 'var(--muted)',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  textAlign: 'center',
                  // align the label under the dot — match the dot row's
                  // flex math (dots are 0-flex, connectors are flex:1)
                  marginLeft: i === 0 ? 0 : -DOT_SIZE / 2,
                  marginRight: i === total - 1 ? 0 : -DOT_SIZE / 2,
                }}
              >
                {s.label}
              </span>
              {i < total - 1 && <span style={{ flex: 1 }} />}
            </span>
          );
        })}
      </div>
      {detail && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
            paddingLeft: 16,
          }}
        >
          ▸ {detail}
        </div>
      )}
    </div>
  );
}
