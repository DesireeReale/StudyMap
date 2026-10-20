import type { CSSProperties } from "react";
import type { NodeRole } from "@/core/roles";

const W = 1200;
const H = 675;

type Point = { x: number; y: number };
type Concept = Point & { label: string };
type Branch = Concept & { role: NodeRole; relation: string; leaves: Concept[] };

const ROOT: Concept = { x: 600, y: 338, label: "Il contratto" };

const BRANCHES: Branch[] = [
  {
    x: 390,
    y: 165,
    label: "Requisiti",
    role: "area-1",
    relation: "richiede",
    leaves: [
      { x: 125, y: 80, label: "Accordo delle parti" },
      { x: 125, y: 165, label: "Causa" },
      { x: 125, y: 250, label: "Oggetto" },
    ],
  },
  {
    x: 810,
    y: 165,
    label: "Effetti",
    role: "area-2",
    relation: "produce",
    leaves: [
      { x: 1075, y: 80, label: "Forza di legge tra le parti" },
      { x: 1075, y: 165, label: "Effetti obbligatori" },
      { x: 1075, y: 250, label: "Effetti reali" },
    ],
  },
  {
    x: 790,
    y: 510,
    label: "Scioglimento",
    role: "area-3",
    relation: "si scioglie per",
    leaves: [
      { x: 1075, y: 425, label: "Mutuo dissenso" },
      { x: 1075, y: 510, label: "Recesso" },
      { x: 1075, y: 595, label: "Risoluzione" },
    ],
  },
  {
    x: 390,
    y: 510,
    label: "Patologie",
    role: "neutro",
    relation: "può presentare",
    leaves: [
      { x: 125, y: 425, label: "Nullità" },
      { x: 125, y: 510, label: "Annullabilità" },
      { x: 125, y: 595, label: "Rescissione" },
    ],
  },
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const cq = (px: number) => `${(px / W) * 100}cqw`;

function curve(a: Point, b: Point) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

function elbow(a: Point, b: Point) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} H${mx} V${b.y} H${b.x}`;
}

function Node({ at, role, size }: { at: Concept; role: NodeRole; size: number }) {
  return (
    <span
      data-role={role}
      className="concept-node absolute -translate-x-1/2 -translate-y-1/2 text-center leading-tight font-bold whitespace-nowrap"
      style={
        {
          left: pct(at.x, W),
          top: pct(at.y, H),
          fontSize: cq(size),
          padding: `${cq(size * 0.6)} ${cq(size * 1.1)}`,
          "--node-bg": `var(--node-${role})`,
          "--node-ink": `var(--node-${role}-ink)`,
        } as CSSProperties
      }
    >
      {at.label}
    </span>
  );
}

export function MapArt({ label, className = "" }: { label?: string; className?: string }) {
  const edges = BRANCHES.flatMap((b) => [[ROOT, b] as const, ...b.leaves.map((l) => [b, l] as const)]);
  return (
    <div
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={`map-art relative aspect-video w-full overflow-hidden bg-sheet font-sans leading-normal font-normal tracking-normal [container-type:inline-size] ${className}`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        {edges.map(([a, b]) => (
          <g key={`${a.label}-${b.label}`} fill="none" style={{ stroke: "var(--edge)", strokeWidth: "var(--edge-width)" }}>
            <path className="edge-curve" d={curve(a, b)} />
            <path className="edge-elbow" d={elbow(a, b)} />
          </g>
        ))}
      </svg>
      {BRANCHES.map((b) => (
        <span
          key={b.relation}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-sheet px-[0.5em] text-muted"
          style={{ left: pct((ROOT.x + b.x) / 2, W), top: pct((ROOT.y + b.y) / 2, H), fontSize: cq(14) }}
        >
          {b.relation}
        </span>
      ))}
      {BRANCHES.flatMap((b) => b.leaves.map((l) => <Node key={l.label} at={l} role={b.role} size={16} />))}
      {BRANCHES.map((b) => (
        <Node key={b.label} at={b} role={b.role} size={18} />
      ))}
      <Node at={ROOT} role="radice" size={22} />
    </div>
  );
}
