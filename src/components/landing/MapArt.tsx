import type { CSSProperties } from "react";
import type { NodeRole } from "@/core/roles";

const W = 1200;
const H = 675;

type Point = { x: number; y: number };
type Concept = Point & { label: string };
type Branch = Concept & { role: NodeRole; relation: string; leaves: Concept[] };

const ROOT: Concept = { x: 600, y: 338, label: "Scompenso cardiaco" };

const BRANCHES: Branch[] = [
  {
    x: 390,
    y: 165,
    label: "Cause",
    role: "area-1",
    relation: "causato da",
    leaves: [
      { x: 125, y: 80, label: "Cardiopatia ischemica" },
      { x: 125, y: 165, label: "Ipertensione arteriosa" },
      { x: 125, y: 250, label: "Valvulopatie" },
    ],
  },
  {
    x: 810,
    y: 165,
    label: "Segni e sintomi",
    role: "area-2",
    relation: "si manifesta con",
    leaves: [
      { x: 1075, y: 80, label: "Dispnea e ortopnea" },
      { x: 1075, y: 165, label: "Edemi declivi" },
      { x: 1075, y: 250, label: "Turgore giugulare" },
    ],
  },
  {
    x: 790,
    y: 510,
    label: "Interventi infermieristici",
    role: "area-3",
    relation: "richiede",
    leaves: [
      { x: 1075, y: 425, label: "Peso ogni mattina" },
      { x: 1075, y: 510, label: "Bilancio idrico" },
      { x: 1075, y: 595, label: "Posizione semi-Fowler" },
    ],
  },
  {
    x: 390,
    y: 510,
    label: "Educazione",
    role: "neutro",
    relation: "prevede",
    leaves: [
      { x: 125, y: 425, label: "Meno sodio a tavola" },
      { x: 125, y: 510, label: "Aderenza alla terapia" },
      { x: 125, y: 595, label: "Segni di peggioramento" },
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
