// Reusable primitives — all named with `ff` prefix to avoid global collisions.
// Loaded as a Babel script. Components attached to window at the bottom.

const { useState, useEffect, useRef, useMemo } = React;

// ─── Icon ─────────────────────────────────────────────────────────
// React-rendered inline SVG (no DOM mutation). lucide@0.469's
// `createIcons()` is unsafe under rapid React re-renders — it removeChild's
// the host node out from under React. We read the icon definition data
// directly from `lucide.icons` and render the children as JSX, which keeps
// the SVG fully owned by React's reconciler.
function Icon({ name, size = 16, stroke = 1.75, style = {}, className = "" }) {
  const iconData = useMemo(() => {
    const lib = window.lucide?.icons;
    if (!lib) return null;
    // lucide names in 0.469: PascalCase keys (e.g. "Hammer", "CircleCheckBig").
    const pascal = name
      .split("-")
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return lib[pascal] || lib[name] || null;
  }, [name]);

  // Each icon is either an array [tag, attrs, children] or { iconNode: [...] }.
  let children = null;
  if (Array.isArray(iconData)) {
    children = iconData[2];
  } else if (iconData && typeof iconData === "object") {
    children = iconData.iconNode || iconData.children;
  }

  if (!children) {
    return <span style={{
      display: "inline-block", width: size, height: size, ...style,
    }} className={className} aria-hidden="true" />;
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg"
         width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
         className={className}
         aria-hidden="true">
      {children.map((c, i) => {
        const [tag, attrs] = c;
        return React.createElement(tag, { key: i, ...attrs });
      })}
    </svg>
  );
}

// ─── Button ───────────────────────────────────────────────────────
const ffBtnBase = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "8px 14px", borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  border: "1px solid transparent",
  transition: "transform 150ms var(--ease-standard), box-shadow 150ms var(--ease-standard), background 150ms, border-color 150ms, color 150ms",
  background: "transparent", color: "var(--text)",
  whiteSpace: "nowrap", userSelect: "none",
};
function Button({ kind = "secondary", size = "md", icon, iconRight, children, disabled, onClick, title, active, style = {}, ...rest }) {
  const sizeStyles = size === "sm"
    ? { padding: "6px 10px", fontSize: 12, gap: 6 }
    : size === "icon"
      ? { padding: 8, gap: 0 }
      : {};
  const kindStyles = {
    primary:   { background: "var(--accent)", color: "#fff" },
    secondary: { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" },
    ghost:     { background: "transparent", color: active ? "var(--text)" : "var(--text-muted)" },
    danger:    { background: "transparent", color: "var(--danger)", borderColor: "var(--danger)" },
    success:   { background: "var(--success)", color: "#0e1117" },
  }[kind];
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const hoverStyle = !disabled && hover ? (
    kind === "primary" ? { transform: "translateY(-2px)", boxShadow: "var(--elev-2)" } :
    kind === "secondary" ? { borderColor: "var(--accent)", background: "var(--accent-glow-soft)" } :
    kind === "ghost" ? { background: "var(--surface)", color: "var(--text)" } :
    kind === "danger" ? { background: "rgba(255,84,112,0.10)" } : {}
  ) : {};
  const pressStyle = press && !disabled ? { transform: "none", boxShadow: "var(--elev-1)" } : {};
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ ...ffBtnBase, ...sizeStyles, ...kindStyles, ...hoverStyle, ...pressStyle,
                ...(active ? { background: "var(--surface)", color: "var(--text)" } : {}),
                ...(disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}), ...style }}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

// ─── Pill / Badge ────────────────────────────────────────────────
function Pill({ tone = "neutral", dot, children, style = {} }) {
  const palettes = {
    neutral: { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" },
    success: { background: "rgba(62,213,152,0.12)", color: "#3ed598" },
    warn:    { background: "rgba(255,181,71,0.12)", color: "#ffb547" },
    danger:  { background: "rgba(255,84,112,0.14)", color: "#ff5470" },
    info:    { background: "rgba(77,171,247,0.12)", color: "#4dabf7" },
    accent:  { background: "var(--accent-glow)",       color: "var(--accent-2)", border: "1px solid var(--accent-glow-strong)" },
    warm:    { background: "var(--warm-glow)",         color: "var(--accent-warm-2)", border: "1px solid var(--warm-glow-strong)" },
    beat:    { background: "var(--warm-glow-strong)",  color: "#fff", border: "1px solid var(--accent-warm)" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 500, lineHeight: 1.4,
      ...palettes[tone], ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
      {children}
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────
function Card({ children, padding = 20, style = {}, hoverable, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding,
        transition: "background 150ms, border-color 150ms, box-shadow 150ms",
        ...(hoverable && hover ? { boxShadow: "var(--elev-1)", borderColor: "var(--border-strong)", cursor: onClick ? "pointer" : "default" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Input + Field wrapper ───────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{label}</label>}
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{hint}</span>}
    </div>
  );
}
function TextInput({ value, onChange, mono, placeholder, style = {}, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type="text" value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        background: "var(--surface-2)", border: `1px solid ${focus ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 6, padding: "8px 10px", color: "var(--text)", outline: "none",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: 13, ...(focus ? { boxShadow: "var(--glow-accent)" } : {}), ...style,
      }}
      {...rest}
    />
  );
}

// ─── Slider ──────────────────────────────────────────────────────
function Slider({ value, min = 0, max = 100, step = 1, onChange, label, valueLabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(label || valueLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          {label && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>}
          {valueLabel && <span className="mono" style={{ fontSize: 12, color: "var(--text)" }}>{valueLabel}</span>}
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}

// ─── Tab strip (segmented) ───────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange?.(v)} style={{
            padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 5, border: "none",
            background: active ? "var(--accent)" : "transparent",
            color: active ? "#fff" : "var(--text-muted)",
            cursor: "pointer", transition: "all 120ms", fontFamily: "inherit",
          }}>{lbl}</button>
        );
      })}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────
function SectionHeading({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────────────
function fmtTime(ms) {
  const s = Math.max(0, ms / 1000);
  const m = Math.floor(s / 60);
  const sec = (s - m * 60);
  return `${String(m).padStart(2,"0")}:${sec.toFixed(2).padStart(5,"0")}`;
}
function fmtTimeShort(ms) {
  const s = Math.max(0, ms / 1000);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s - m * 60);
  return `${m}:${String(sec).padStart(2,"0")}`;
}

Object.assign(window, {
  Icon, Button, Pill, Card, Field, TextInput, Slider, Segmented, SectionHeading,
  fmtTime, fmtTimeShort,
});
