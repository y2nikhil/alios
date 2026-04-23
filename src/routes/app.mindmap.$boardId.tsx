import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnConnectStart,
  type OnConnectEnd,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Plus,
  Sparkles,
  Trash2,
  Brain,
  FileImage,
  Link as LinkIcon,
  CheckSquare,
  MoreHorizontal,
  Pencil,
  Palette,
  UserPlus,
  Tag,
  Share2,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/mindmap/$boardId")({
  head: () => ({
    meta: [
      { title: "Mind Map — ALIOS" },
      { name: "description", content: "Infinite-canvas mind map." },
    ],
  }),
  component: BoardPage,
});

type NodeKind = "text" | "image" | "link" | "task";
type NodeData = {
  text?: string;
  url?: string;
  imageUrl?: string;
  done?: boolean;
  color?: string;
  kind: NodeKind;
  assignee?: string | null;
  tags?: string[];
  autoEdit?: boolean;
  onUpdate?: (p: Partial<NodeData>) => void;
  onMenu?: (clientX: number, clientY: number) => void;
};

const EDGE_STROKE = "oklch(0.78 0.16 280 / 0.55)";
const EDGE_OPTIONS = {
  type: "default" as const,
  animated: true,
  style: { stroke: EDGE_STROKE, strokeWidth: 1.75 },
};

const NODE_TYPES = { alios: AliosNode } as const;

function BoardPage() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}

function Canvas() {
  const { boardId } = Route.useParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("Untitled board");
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null } | null>(null);
  const positionDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [board, ns, es] = await Promise.all([
        supabase.from("mindmap_boards").select("*").eq("id", boardId).single(),
        supabase.from("mindmap_nodes").select("*").eq("board_id", boardId),
        supabase.from("mindmap_edges").select("*").eq("board_id", boardId),
      ]);
      if (board.data) setTitle(board.data.title);
      const flowNodes: Node<NodeData>[] = (ns.data ?? []).map((n: any) => ({
        id: n.id,
        type: "alios",
        position: { x: n.position_x, y: n.position_y },
        data: { ...(n.data || {}), kind: n.node_type, color: n.color, tags: n.tags ?? [] } as NodeData,
        style: n.width ? { width: n.width, height: n.height } : undefined,
      }));
      const flowEdges: Edge[] = (es.data ?? []).map((e: any) => ({
        id: e.id, source: e.source_node_id, target: e.target_node_id, ...EDGE_OPTIONS,
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
    })();
  }, [user, boardId, setNodes, setEdges]);

  const persistNode = useCallback(
    async (n: Node<NodeData>) => {
      if (!user) return;
      const data = n.data;
      await supabase.from("mindmap_nodes").upsert({
        id: n.id, board_id: boardId, user_id: user.id, node_type: data.kind,
        position_x: n.position.x, position_y: n.position.y,
        data: { text: data.text, url: data.url, imageUrl: data.imageUrl, done: data.done, assignee: data.assignee },
        color: data.color ?? null, tags: data.tags ?? [],
      });
    },
    [user, boardId],
  );

  const persistEdge = useCallback(
    async (e: Edge) => {
      if (!user) return;
      await supabase.from("mindmap_edges").upsert({
        id: e.id, board_id: boardId, user_id: user.id,
        source_node_id: e.source, target_node_id: e.target,
      });
    },
    [user, boardId],
  );

  const updateNodeData = useCallback(
    (id: string, partial: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const updated = { ...n, data: { ...n.data, ...partial } };
          if (Object.keys(partial).some((k) => k !== "autoEdit")) persistNode(updated);
          return updated;
        }),
      );
    },
    [setNodes, persistNode],
  );

  const removeNode = useCallback(
    async (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      await Promise.all([
        supabase.from("mindmap_edges").delete().or(`source_node_id.eq.${id},target_node_id.eq.${id}`),
        supabase.from("mindmap_nodes").delete().eq("id", id),
      ]);
      setContextMenu(null);
    },
    [setNodes, setEdges],
  );

  const removeManyNodes = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setNodes((nds) => nds.filter((n) => !ids.includes(n.id)));
      setEdges((eds) => eds.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));
      await Promise.all([
        supabase.from("mindmap_edges").delete().in("source_node_id", ids),
        supabase.from("mindmap_edges").delete().in("target_node_id", ids),
        supabase.from("mindmap_nodes").delete().in("id", ids),
      ]);
    },
    [setNodes, setEdges],
  );

  const addNode = useCallback(
    async (
      position: { x: number; y: number },
      kind: NodeKind = "text",
      data: Partial<NodeData> = {},
      opts: { autoEdit?: boolean } = {},
    ) => {
      if (!user) return null;
      const id = crypto.randomUUID();
      const newNode: Node<NodeData> = {
        id, type: "alios", position,
        data: {
          kind, text: kind === "text" || kind === "task" ? (data.text ?? "") : data.text,
          ...data, autoEdit: opts.autoEdit ?? (kind === "text" || kind === "task"),
        } as NodeData,
        selected: true,
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
      await supabase.from("mindmap_nodes").insert({
        id, board_id: boardId, user_id: user.id, node_type: kind,
        position_x: position.x, position_y: position.y,
        data: { text: data.text, url: data.url, imageUrl: data.imageUrl, done: data.done },
      });
      return id;
    },
    [user, boardId, setNodes],
  );

  // Double-click on EMPTY canvas only — ignore clicks inside nodes/controls
  const onWrapperDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__minimap") ||
        target.closest(".alios-controls") ||
        target.closest("input, textarea, button, [contenteditable=true]")
      ) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode({ x: pos.x - 90, y: pos.y - 30 }, "text", {}, { autoEdit: true });
    },
    [rf, addNode],
  );

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectStartRef.current = { nodeId: params.nodeId ?? null, handleId: params.handleId ?? null };
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event) => {
      const start = connectStartRef.current;
      if (!start?.nodeId) return;
      const target = (event.target as HTMLElement)?.closest(".react-flow__node");
      if (target) return;
      const ev = event as MouseEvent;
      const pos = rf.screenToFlowPosition({ x: ev.clientX - 90, y: ev.clientY - 30 });
      const newId = await addNode(pos, "text", {}, { autoEdit: true });
      if (!newId) return;
      const newEdge: Edge = { id: crypto.randomUUID(), source: start.nodeId, target: newId, ...EDGE_OPTIONS };
      setEdges((eds) => eds.concat(newEdge));
      persistEdge(newEdge);
    },
    [rf, addNode, setEdges, persistEdge],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      const newEdge: Edge = { ...conn, id: crypto.randomUUID(), ...EDGE_OPTIONS } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));
      persistEdge(newEdge);
    },
    [setEdges, persistEdge],
  );

  // Smart paste
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable=true]")) return;
      const text = e.clipboardData?.getData("text/plain");
      const items = e.clipboardData?.items ?? [];
      const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => addNode(center, "image", { imageUrl: String(reader.result) });
            reader.readAsDataURL(file);
            return;
          }
        }
      }
      if (text) {
        const isUrl = /^https?:\/\//i.test(text.trim());
        if (isUrl) addNode(center, "link", { url: text.trim(), text: text.trim() });
        else addNode(center, "text", { text });
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [rf, addNode]);

  // Delete-key support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      if (selectedIds.length === 0) return;
      e.preventDefault();
      removeManyNodes(selectedIds);
      toast.success(`Deleted ${selectedIds.length} node${selectedIds.length > 1 ? "s" : ""}`);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodes, removeManyNodes]);

  const aiAction = async (id: string, action: "summarize" | "expand" | "tasks") => {
    const node = nodes.find((n) => n.id === id);
    const text = node?.data?.text;
    if (!text) return toast.error("No text to process");
    toast.loading("AI thinking…", { id: "ai" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-mindmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ action, text }),
      });
      const data = await res.json();
      toast.dismiss("ai");
      if (action === "tasks" && Array.isArray(data.items)) {
        const start = node!.position;
        for (let i = 0; i < data.items.length; i++) {
          const newId = await addNode({ x: start.x + 280, y: start.y + i * 90 }, "task", { text: data.items[i], done: false });
          if (newId) {
            const e: Edge = { id: crypto.randomUUID(), source: id, target: newId, ...EDGE_OPTIONS };
            setEdges((eds) => eds.concat(e));
            persistEdge(e);
          }
        }
        toast.success(`Created ${data.items.length} tasks`);
      } else if (data.text) {
        const newId = await addNode({ x: node!.position.x + 280, y: node!.position.y }, "text", { text: data.text });
        if (newId) {
          const e: Edge = { id: crypto.randomUUID(), source: id, target: newId, ...EDGE_OPTIONS };
          setEdges((eds) => eds.concat(e));
          persistEdge(e);
        }
      }
    } catch {
      toast.dismiss("ai");
      toast.error("AI request failed");
    }
    setContextMenu(null);
  };

  const openMenuFor = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ x, y, nodeId });
  }, []);

  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdate: (p: Partial<NodeData>) => updateNodeData(n.id, p),
          onMenu: (x: number, y: number) => openMenuFor(n.id, x, y),
        },
      })),
    [nodes, updateNodeData, openMenuFor],
  );

  const saveTitle = async (t: string) => {
    setTitle(t);
    await supabase.from("mindmap_boards").update({ title: t }).eq("id", boardId);
  };

  const onNodeDragStop = useCallback(
    (_: any, n: Node<NodeData>) => {
      const map = positionDebounceRef.current;
      const existing = map.get(n.id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        persistNode(n);
        map.delete(n.id);
      }, 300);
      map.set(n.id, t);
    },
    [persistNode],
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/app/mindmap"><Button size="icon" variant="ghost"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <input
            value={title}
            onChange={(e) => saveTitle(e.target.value)}
            className="bg-transparent font-semibold text-base focus:outline-none focus:bg-white/5 rounded px-2 py-1 min-w-0 truncate"
          />
        </div>
        <div className="hidden md:flex gap-1.5 text-xs text-muted-foreground">
          Double-click empty area to add · Drag handles to connect · Del to remove
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 relative" onDoubleClick={onWrapperDoubleClick}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={(e, n) => {
            e.preventDefault();
            openMenuFor(n.id, e.clientX, e.clientY);
          }}
          onPaneClick={() => setContextMenu(null)}
          onMoveStart={() => setContextMenu(null)}
          nodeTypes={NODE_TYPES}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={EDGE_OPTIONS}
          deleteKeyCode={null}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="oklch(1 0 0 / 0.035)" gap={28} size={1} />
          <Controls
            position="bottom-left"
            className="alios-controls !left-4 !bottom-4 !shadow-2xl !rounded-xl !overflow-hidden !border !border-white/10 !bg-[oklch(0.18_0.025_265)]/95 backdrop-blur-md [&>button]:!bg-transparent [&>button]:!border-b [&>button]:!border-white/10 [&>button]:!text-foreground [&>button:hover]:!bg-white/10 [&>button:last-child]:!border-b-0 [&_svg]:!fill-foreground"
          />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            className="!right-4 !bottom-4 !rounded-xl !border !border-white/10 !bg-[oklch(0.18_0.025_265)]/95 !backdrop-blur-md !shadow-2xl"
            nodeColor={(n) => (n.data as NodeData)?.color ?? "oklch(0.74 0.16 280)"}
            nodeStrokeWidth={2}
            maskColor="oklch(0.13 0.02 265 / 0.7)"
          />
        </ReactFlow>

        {contextMenu && (
          <div
            className="fixed z-50 glass rounded-xl p-1.5 min-w-52 text-sm shadow-2xl border border-white/10 alios-controls"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={Pencil}
              onClick={() => { updateNodeData(contextMenu.nodeId, { autoEdit: true }); setContextMenu(null); }}
            >
              Rename
            </MenuItem>
            <div className="px-2.5 py-1.5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                <Palette className="h-3 w-3" /> Color
              </div>
              <ColorPicker onPick={(c) => { updateNodeData(contextMenu.nodeId, { color: c ?? undefined }); setContextMenu(null); }} />
            </div>
            <MenuItem
              icon={UserPlus}
              onClick={() => {
                const name = prompt("Assign to (email or name):");
                if (name) updateNodeData(contextMenu.nodeId, { assignee: name });
                setContextMenu(null);
              }}
            >
              Assign to…
            </MenuItem>
            <MenuItem
              icon={Tag}
              onClick={() => {
                const tag = prompt("Add a tag:");
                if (tag) {
                  const node = nodes.find((n) => n.id === contextMenu.nodeId);
                  const existing = node?.data?.tags ?? [];
                  updateNodeData(contextMenu.nodeId, { tags: [...existing, tag.trim()] });
                }
                setContextMenu(null);
              }}
            >
              Add tag
            </MenuItem>
            <div className="my-1 h-px bg-white/10" />
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "summarize")}>AI: Summarize</MenuItem>
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "expand")}>AI: Expand idea</MenuItem>
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "tasks")}>AI: Convert to tasks</MenuItem>
            <div className="my-1 h-px bg-white/10" />
            <MenuItem icon={Trash2} onClick={() => removeNode(contextMenu.nodeId)} destructive>Delete</MenuItem>
          </div>
        )}

        <button
          onClick={() => addNode(rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }), "text", {}, { autoEdit: true })}
          className="alios-controls absolute bottom-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/40 flex items-center justify-center text-white hover:scale-105 transition-transform"
          title="Add node"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon, children, onClick, destructive,
}: { icon: typeof Sparkles; children: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors ${destructive ? "text-destructive hover:text-destructive" : ""}`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function ColorPicker({ onPick }: { onPick: (c: string | null) => void }) {
  const colors: (string | null)[] = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", null];
  return (
    <div className="flex gap-1.5">
      {colors.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(c)}
          className="h-6 w-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
          style={{ backgroundColor: c ?? "transparent", backgroundImage: c ? undefined : "linear-gradient(135deg,#fff3,transparent)" }}
          title={c ?? "Default"}
        />
      ))}
    </div>
  );
}

const KIND_ICON: Record<NodeKind, typeof Brain> = {
  text: Brain, image: FileImage, link: LinkIcon, task: CheckSquare,
};

function AliosNode(props: NodeProps<NodeData>) {
  const { data, selected } = props;
  const onUpdate = data.onUpdate;
  const onMenu = data.onMenu;
  const [editing, setEditing] = useState<boolean>(!!data.autoEdit);
  const [expanded, setExpanded] = useState(false);
  const Icon = KIND_ICON[data.kind as NodeKind] ?? Brain;
  const accent = data.color ?? "oklch(0.74 0.16 280)";
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (data.autoEdit) {
      setEditing(true);
      onUpdate?.({ autoEdit: false });
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.autoEdit]);

  const finishEditing = () => setEditing(false);

  // CRITICAL: Stop double-click bubbling so the wrapper handler does NOT create a new node.
  const onCardDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.kind === "text" || data.kind === "task") setEditing(true);
  };

  return (
    <div
      onDoubleClick={onCardDoubleClick}
      className="group relative rounded-2xl border bg-[oklch(0.21_0.025_265_/_0.92)] backdrop-blur-md min-w-[176px] max-w-sm shadow-xl transition-all"
      style={{
        borderColor: selected ? accent : "oklch(1 0 0 / 0.08)",
        boxShadow: selected
          ? `0 0 0 1px ${accent}, 0 0 40px -8px ${accent}`
          : "0 12px 30px -12px oklch(0 0 0 / 0.45), inset 0 1px 0 0 oklch(1 0 0 / 0.04)",
      }}
    >
      <Handle type="source" position={Position.Top} id="t" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} id="r" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Bottom} id="b" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Left} id="l" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Top} id="tt" className="!opacity-0" />
      <Handle type="target" position={Position.Bottom} id="tb" className="!opacity-0" />
      <Handle type="target" position={Position.Left} id="tl" className="!opacity-0" />
      <Handle type="target" position={Position.Right} id="tr" className="!opacity-0" />

      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <Icon className="h-3 w-3 shrink-0" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex-1">
          {data.kind}
        </span>
        {data.assignee && (
          <span className="text-[10px] rounded-full bg-white/10 px-1.5 py-0.5 text-foreground/80">
            @{data.assignee}
          </span>
        )}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onMenu?.(rect.right, rect.bottom);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-white/10 text-muted-foreground hover:text-foreground"
          title="More options"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3">
        {data.kind === "image" && data.imageUrl && (
          <img src={data.imageUrl} alt="" className="rounded-md max-w-full max-h-48 object-cover" />
        )}
        {data.kind === "link" && data.url && (
          <a href={data.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary hover:underline break-all">
            {data.url}
          </a>
        )}
        {data.kind === "task" && !editing && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.done}
              onChange={(e) => onUpdate?.({ done: e.target.checked })}
              onMouseDown={(e) => e.stopPropagation()}
              className="mt-1 accent-primary"
            />
            <span className={data.done ? "line-through text-muted-foreground" : ""}>
              {data.text || "New task"}
            </span>
          </label>
        )}
        {(data.kind === "text" || data.kind === "task") && editing && (
          <textarea
            ref={inputRef}
            value={data.text ?? ""}
            onChange={(e) => onUpdate?.({ text: e.target.value })}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEditing(); }
              if (e.key === "Escape") finishEditing();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            rows={3}
            placeholder={data.kind === "task" ? "What needs doing?" : "Type your idea…"}
            className="w-full bg-transparent text-sm focus:outline-none resize-none placeholder:text-muted-foreground"
          />
        )}
        {data.kind === "text" && !editing && (
          <div className="text-sm whitespace-pre-wrap cursor-text min-h-6">
            {data.text ? (
              expanded || data.text.length < 140 ? data.text : data.text.slice(0, 140) + "…"
            ) : (
              <span className="text-muted-foreground italic">Double-click to edit</span>
            )}
            {data.text && data.text.length > 140 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                className="ml-1 text-xs text-primary hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {data.tags && data.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.tags.map((t) => (
              <span key={t} className="text-[10px] rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
