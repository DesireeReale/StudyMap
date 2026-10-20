import type { CSSProperties } from "react";
import type { NodeRole } from "@/core/roles";

type Point = { x: number; y: number };
type Concept = Point & { label: string };
type Branch = Concept & {
  role: NodeRole;
  relation?: string;
  leaves: Concept[];
};

export type MapArtData = {
  width: number;
  height: number;
  direction: "lr" | "tb";
  sizes: { root: number; branch: number; leaf: number };
  root: Concept;
  branches: Branch[];
};

export const HEART_FAILURE: MapArtData = {
  width: 560,
  height: 300,
  direction: "tb",
  sizes: { root: 16, branch: 15, leaf: 14 },
  root: { x: 280, y: 42, label: "Scompenso cardiaco" },
  branches: [
    {
      x: 105,
      y: 148,
      label: "Segni e sintomi",
      role: "area-1",
      relation: "si manifesta con",
      leaves: [
        { x: 52, y: 248, label: "Dispnea" },
        { x: 152, y: 248, label: "Edemi" },
      ],
    },
    {
      x: 280,
      y: 148,
      label: "Farmaci",
      role: "area-2",
      relation: "si tratta con",
      leaves: [{ x: 280, y: 248, label: "Diuretici" }],
    },
    {
      x: 455,
      y: 148,
      label: "Assistenza",
      role: "area-3",
      relation: "richiede",
      leaves: [
        { x: 403, y: 248, label: "Peso al giorno" },
        { x: 513, y: 248, label: "Diuresi" },
      ],
    },
  ],
};

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function curve(a: Point, b: Point, tb: boolean) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return tb
    ? `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`
    : `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

function elbow(a: Point, b: Point, tb: boolean) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return tb
    ? `M${a.x},${a.y} V${my} H${b.x} V${b.y}`
    : `M${a.x},${a.y} H${mx} V${b.y} H${b.x}`;
}

function Node({
  at,
  role,
  size,
  W,
  H,
}: {
  at: Concept;
  role: NodeRole;
  size: number;
  W: number;
  H: number;
}) {
  const cq = (px: number) => `${(px / W) * 100}cqw`;
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

export function MapArt({
  data,
  label,
  className = "",
}: {
  data: MapArtData;
  label?: string;
  className?: string;
}) {
  const { width: W, height: H, root, branches, sizes } = data;
  const tb = data.direction === "tb";
  const cq = (px: number) => `${(px / W) * 100}cqw`;
  const edges = branches.flatMap((b) => [
    [root, b] as const,
    ...b.leaves.map((l) => [b, l] as const),
  ]);

  return (
    <div
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      className={`map-art relative w-full overflow-hidden bg-sheet font-sans leading-normal font-normal tracking-normal [container-type:inline-size] ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        {edges.map(([a, b]) => (
          <g
            key={`${a.label}-${b.label}`}
            fill="none"
            style={{ stroke: "var(--edge)", strokeWidth: "var(--edge-width)" }}
          >
            <path className="edge-curve" d={curve(a, b, tb)} />
            <path className="edge-elbow" d={elbow(a, b, tb)} />
          </g>
        ))}
      </svg>
      {branches.map(
        (b) =>
          b.relation && (
            <span
              key={b.relation}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-sheet px-[0.5em] text-muted"
              style={{
                left: pct((root.x + b.x) / 2, W),
                top: pct((root.y + b.y) / 2, H),
                fontSize: cq(sizes.leaf - 2),
              }}
            >
              {b.relation}
            </span>
          ),
      )}
      {branches.flatMap((b) =>
        b.leaves.map((l) => (
          <Node
            key={l.label}
            at={l}
            role={b.role}
            size={sizes.leaf}
            W={W}
            H={H}
          />
        )),
      )}
      {branches.map((b) => (
        <Node
          key={b.label}
          at={b}
          role={b.role}
          size={sizes.branch}
          W={W}
          H={H}
        />
      ))}
      <Node at={root} role="radice" size={sizes.root} W={W} H={H} />
    </div>
  );
}
