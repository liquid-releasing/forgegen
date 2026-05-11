// Project tab — placeholder for v0.
//
// Per REFACTOR_TO_TAURI_REACT.md migration order: Project is tab #2 (after
// the Tauri+Vite+React shell, which is what the App.jsx scaffold is).
// Real Project tab needs:
//   - file picker (Tauri dialog API)
//   - recent projects list
//   - device selection (gates Stim/Multi-axis tabs in FFP — not in forgegen)
//
// JSX baseline lives at:
//   forge-ui-design/iterations/08-redesign/design_files/tab-Project.jsx
// Port it after the bridge sanity check below proves the stack works.

export default function Project() {
  return (
    <section className="tab-project">
      <h2>Project</h2>
      <p className="muted">
        Placeholder. Real implementation lands after the bridge proves itself
        below — file picker → videoflow analyze, recents, device selection.
      </p>
    </section>
  );
}
