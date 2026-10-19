import type { Graph } from "@/core/graph";

export function MapThumb({ graph, width = 72, height = 48 }: { graph: Graph; width?: number; height?: number }) {
  const nodes = graph.nodes ?? [];
  if (!nodes.length) return <span className="block rounded-lg bg-surface" style={{ width, height }} />;
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 6;
  const sx = (width - pad * 2) / Math.max(maxX - minX, 1);
  const sy = (height - pad * 2) / Math.max(maxY - minY, 1);
  const s = Math.min(sx, sy);
  const offX = (width - (maxX - minX) * s) / 2;
  const offY = (height - (maxY - minY) * s) / 2;
  const at = new Map(nodes.map((n) => [n.id, { x: offX + (n.position.x - minX) * s, y: offY + (n.position.y - minY) * s }]));
  const root = nodes.find((n) => !graph.edges.some((e) => e.target === n.id));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-auto max-w-full shrink-0 rounded-lg bg-surface" aria-hidden="true">
      {graph.edges.map((e) => {
        const a = at.get(e.source);
        const b = at.get(e.target);
        return a && b ? <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--control)" strokeWidth={1} /> : null;
      })}
      {nodes.map((n) => {
        const p = at.get(n.id)!;
        return (
          <circle key={n.id} cx={p.x} cy={p.y} r={n.id === root?.id ? 3.5 : 2.2} fill={n.id === root?.id ? "var(--accent)" : "var(--text)"} />
        );
      })}
    </svg>
  );
}

export type DeckCounts = { known: number; unknown: number; fresh: number };

export function DeckStrip({ counts }: { counts: DeckCounts }) {
  const total = counts.known + counts.unknown + counts.fresh;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
        {counts.known > 0 && <span className="h-full bg-accent" style={{ width: `${pct(counts.known)}%` }} />}
        {counts.unknown > 0 && <span className="h-full bg-ink" style={{ width: `${pct(counts.unknown)}%` }} />}
        {counts.fresh > 0 && <span className="h-full bg-control" style={{ width: `${pct(counts.fresh)}%` }} />}
      </div>
      <p className="num text-[13px] text-muted">
        <span className={counts.known > 0 ? "text-accent" : undefined}>{counts.known} so</span> · {counts.unknown} non so · {counts.fresh} nuove
      </p>
    </div>
  );
}

export function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const finite = Number.isFinite(limit);
  const ratio = finite ? Math.min(used / limit, 1) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">{label}</span>
        <span className="num text-sm text-muted">
          <span className="text-ink">{used}</span> {finite ? `di ${limit}` : ""} {unit}
        </span>
      </div>
      {finite && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <span
            className={`block h-full rounded-full ${ratio >= 1 ? "bg-negative" : "bg-accent"}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
