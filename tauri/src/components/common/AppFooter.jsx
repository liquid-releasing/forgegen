import { AcceptBar } from 'forgemoment';

export default function AppFooter({
  tab,
  tabs,
  busy,
  error,
  gate,
  chainFile,
  onClearError,
  onAccept,
}) {
  const current = tabs.find((t) => t.id === tab);
  const nextId = {
    library: 'project',
    project: 'analysis',
    analysis: 'sources',
    sources: 'recipes',
    recipes: 'generate',
    generate: 'output',
  }[tab];
  const next = tabs.find((t) => t.id === nextId);
  const summary = busy
    ? `${current?.label || 'ForgeGen'} in progress`
    : gate
      ? gate
      : next
        ? `${current?.label || 'ForgeGen'} is ready to continue to ${next.label}`
        : `${current?.label || 'ForgeGen'} has no downstream stage`;

  return (
    <AcceptBar
      summary={summary}
      chainFile={chainFile}
      accepted={false}
      primaryLabel={next ? `Continue to ${next.label}` : 'Continue'}
      error={error}
      busy={busy}
      gate={gate}
      ready={!gate && !busy && !error}
      onClearError={onClearError}
      onAccept={onAccept}
      onReset={null}
      hideActions={!next}
    />
  );
}
