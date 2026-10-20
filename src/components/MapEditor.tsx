"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_STYLES, type AppStyle } from "@/config/styles";
import { NODE_ROLES, childRole, layoutGraph, nodeRole, type Graph, type NodeRole } from "@/core/graph";
import { graphToMarkdown, graphToOpml } from "@/core/export";
import { Icon } from "./icons";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ConceptNode = Node<{ label: string; color: NodeRole }, "concept">;
type ExportOptions = { png: boolean; pdf: boolean; watermark: boolean };

const EditingContext = createContext<{
  editingId: string | null;
  rename: (id: string, label: string | null) => void;
  startEditing: (id: string) => void;
}>({ editingId: null, rename: () => {}, startEditing: () => {} });

function ConceptNodeView({ id, data, selected }: NodeProps<ConceptNode>) {
  const { editingId, rename, startEditing } = use(EditingContext);
  return (
    <div
      onDoubleClick={() => startEditing(id)}
      data-role={data.color}
      style={roleStyle(data.color)}
      className={`concept-node max-w-[260px] min-w-[120px] px-4 py-2.5 text-center text-[15px] leading-snug font-bold ${
        selected ? "outline-3 outline-offset-3 outline-[var(--focus)]" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      {editingId === id ? (
        <input
          ref={focusWhenVisible}
          defaultValue={data.label}
          aria-label="Nome del concetto"
          className="nodrag w-full rounded-md bg-sheet px-1.5 py-0.5 text-ink"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") rename(id, e.currentTarget.value);
            if (e.key === "Escape") rename(id, null);
          }}
          onBlur={(e) => rename(id, e.currentTarget.value)}
        />
      ) : (
        data.label
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function roleStyle(role: NodeRole) {
  return { "--node-bg": `var(--node-${role})`, "--node-ink": `var(--node-${role}-ink)` } as React.CSSProperties;
}

function focusWhenVisible(el: HTMLInputElement | null) {
  if (!el) return;
  let tries = 0;
  const attempt = () => {
    el.focus();
    el.select();
    if (document.activeElement !== el && ++tries < 20) requestAnimationFrame(attempt);
  };
  attempt();
}

const nodeTypes = { concept: ConceptNodeView };

function toGraph(nodes: ConceptNode[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: { label: n.data.label, color: n.data.color } })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(typeof e.label === "string" && e.label ? { label: e.label } : {}),
    })),
  };
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

async function addWatermark(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "rgba(28, 36, 48, 0.55)";
  ctx.textAlign = "right";
  ctx.fillText("Creato con StudyMap", img.width - 16, img.height - 16);
  return canvas.toDataURL("image/png");
}

export function MapEditor(props: {
  mapId: string;
  title: string;
  graph: Graph;
  exportOptions: ExportOptions;
  appStyle: AppStyle;
}) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}

function Editor({
  mapId,
  title,
  graph,
  exportOptions,
  appStyle,
}: {
  mapId: string;
  title: string;
  graph: Graph;
  exportOptions: ExportOptions;
  appStyle: AppStyle;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptNode>(
    graph.nodes.map((n) => ({ ...n, type: "concept" as const, data: { ...n.data, color: nodeRole(n.data.color) } })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);
  const [mapTitle, setMapTitle] = useState(title);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const { fitView, getNodes, deleteElements } = useReactFlow<ConceptNode>();

  const snapshot = useMemo(() => JSON.stringify([mapTitle, toGraph(nodes, edges)]), [mapTitle, nodes, edges]);
  const savedSnapshot = useRef(snapshot);

  useEffect(() => {
    if (snapshot === savedSnapshot.current) return;
    setStatus("saving");
    const timer = setTimeout(async () => {
      const [t, g] = JSON.parse(snapshot) as [string, Graph];
      const { error } = await supabaseBrowser()
        .from("maps")
        .update({ title: t.trim() || "Mappa senza titolo", graph: g, updated_at: new Date().toISOString() })
        .eq("id", mapId);
      if (!error) savedSnapshot.current = snapshot;
      setStatus(error ? "error" : "saved");
    }, 800);
    return () => clearTimeout(timer);
  }, [snapshot, mapId]);

  const selected = nodes.filter((n) => n.selected);
  const colorNames = APP_STYLES.find((s) => s.id === appStyle)!.colors;
  const edgeType = appStyle === "evidenziatore" ? "smoothstep" : "straight";
  const styledEdges = useMemo(() => edges.map((e) => ({ ...e, type: edgeType })), [edges, edgeType]);

  const rename = useCallback(
    (id: string, label: string | null) => {
      const value = label?.trim();
      if (value) setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: value } } : n)));
      setEditingId(null);
    },
    [setNodes],
  );

  function addChild() {
    const parent = selected[0] ?? nodes[0];
    const id = crypto.randomUUID().slice(0, 8);
    const siblings = parent ? edges.filter((e) => e.source === parent.id).length : 0;
    const node: ConceptNode = {
      id,
      type: "concept",
      position: parent ? { x: parent.position.x + siblings * 40, y: parent.position.y + 120 } : { x: 0, y: 0 },
      data: { label: "Nuovo concetto", color: childRole(parent?.data.color, siblings) },
      selected: true,
    };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
    if (parent) setEdges((es) => [...es, { id: `${parent.id}-${id}`, source: parent.id, target: id }]);
    setEditingId(id);
  }

  function setColor(color: NodeRole) {
    setNodes((ns) => ns.map((n) => (n.selected ? { ...n, data: { ...n.data, color } } : n)));
  }

  function relayout() {
    const laid = layoutGraph(toGraph(nodes, edges));
    const pos = new Map(laid.nodes.map((n) => [n.id, n.position]));
    setNodes((ns) => ns.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })));
    requestAnimationFrame(() => fitView({ padding: 0.15 }));
  }

  async function renderPng(): Promise<{ dataUrl: string; width: number; height: number }> {
    const bounds = getNodesBounds(getNodes());
    const width = Math.max(800, Math.ceil(bounds.width + 160));
    const height = Math.max(600, Math.ceil(bounds.height + 160));
    const vp = getViewportForBounds(bounds, width, height, 0.2, 2, 0.08);
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport")!;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(viewport, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--sheet").trim() || "#ffffff",
      width,
      height,
      skipFonts: true,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        fontFamily: "system-ui, sans-serif",
      },
    });
    return { dataUrl: exportOptions.watermark ? await addWatermark(dataUrl) : dataUrl, width, height };
  }

  async function exportPng() {
    download((await renderPng()).dataUrl, `${mapTitle || "mappa"}.png`);
  }

  async function exportPdf() {
    const [{ dataUrl, width, height }, { jsPDF }] = await Promise.all([renderPng(), import("jspdf")]);
    const pdf = new jsPDF({ orientation: width > height ? "landscape" : "portrait", unit: "px", format: [width, height] });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`${mapTitle || "mappa"}.pdf`);
  }

  function exportText(kind: "md" | "opml") {
    const name = mapTitle || "mappa";
    const text = kind === "md" ? graphToMarkdown(name, toGraph(nodes, edges)) : graphToOpml(name, toGraph(nodes, edges));
    const url = URL.createObjectURL(new Blob([text], { type: kind === "md" ? "text/markdown" : "text/x-opml" }));
    download(url, `${name}.${kind}`);
    URL.revokeObjectURL(url);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (editingId || selected.length !== 1) return;
    if (e.key === "F2" || (e.key === "Enter" && (e.target as HTMLElement).classList.contains("react-flow__node"))) {
      e.preventDefault();
      setEditingId(selected[0]!.id);
    }
  }

  const statusText = { saved: "Salvato", saving: "Salvataggio…", error: "Salvataggio non riuscito" }[status];

  return (
    <EditingContext value={{ editingId, rename, startEditing: setEditingId }}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="sr-only">Mappa: {mapTitle}</h1>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Titolo della mappa</span>
            <input
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              maxLength={200}
              className="h-11 w-full rounded-field border border-transparent bg-transparent px-2 text-[24px] font-bold text-ink hover:border-border focus:border-control"
            />
          </label>
          <span role="status" className={`text-sm ${status === "error" ? "text-negative" : "text-muted"}`}>
            {statusText}
          </span>
        </div>

        <div role="toolbar" aria-label="Strumenti della mappa" className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={addChild}>
            <Icon name="plus" />
            Concetto
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={selected.length !== 1}
            aria-keyshortcuts="F2"
            onClick={() => setEditingId(selected[0]!.id)}
          >
            Rinomina
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={!selected.length}
            aria-keyshortcuts="Delete"
            onClick={() => deleteElements({ nodes: selected })}
          >
            <Icon name="trash" />
            Elimina
          </button>
          <span className="flex items-center gap-1.5 px-1" role="group" aria-label="Colore del concetto selezionato">
            {NODE_ROLES.map((r, i) => (
              <button
                key={r}
                type="button"
                disabled={!selected.length}
                onClick={() => setColor(r)}
                aria-label={`Colore ${colorNames[i]}`}
                title={colorNames[i]}
                className="size-8 cursor-pointer rounded-full border border-control transition-transform duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: `var(--node-${r})` }}
              />
            ))}
          </span>
          <button type="button" className="btn-ghost" onClick={relayout}>
            <Icon name="layout" />
            Riordina
          </button>
          <span className="ml-auto flex gap-2">
            <button type="button" className="btn-secondary" onClick={exportPng}>
              <Icon name="download" />
              PNG
            </button>
            {exportOptions.pdf && (
              <button type="button" className="btn-secondary" onClick={exportPdf}>
                <Icon name="download" />
                PDF
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => exportText("md")}>
              <Icon name="download" />
              Markdown
            </button>
            <button type="button" className="btn-secondary" onClick={() => exportText("opml")}>
              <Icon name="download" />
              OPML
            </button>
          </span>
        </div>

        <div className="h-[calc(100dvh-260px)] min-h-[420px] overflow-hidden rounded-row border border-border bg-sheet" onKeyDown={onKeyDown}>
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(c: Connection) => setEdges((es) => addEdge(c, es))}
            deleteKeyCode={editingId ? null : ["Delete", "Backspace"]}
            style={{ backgroundColor: "transparent" }}
            defaultEdgeOptions={{
              labelStyle: { fontSize: 13, fill: "var(--text)" },
              labelBgStyle: { fill: "var(--sheet)" },
              labelBgPadding: [4, 2],
            }}
            fitView
            minZoom={0.1}
            ariaLabelConfig={{ "node.a11yDescription.default": "Premi Invio o F2 per rinominare, Canc per eliminare, frecce per spostare." }}
          >
            <Background color="var(--control)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <p className="text-sm text-muted">
          Doppio clic o F2 per rinominare · trascina dal pallino inferiore di un concetto per collegarlo a un altro · Canc
          per eliminare.
        </p>
      </div>
    </EditingContext>
  );
}
