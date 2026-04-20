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
import { ChevronLeft, Plus, Sparkles, Trash2, Brain, FileImage, Link as LinkIcon, CheckSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mindmap/$boardId")({
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
};

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null } | null>(null);

  // Load board
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [board, ns, es] = await Promise.all([
        supabase.from("mindmap_boards").select("*").eq("id", boardId).single(),
        supabase.from("mindmap_nodes").select("*").eq("board_id", boardId),
        supabase.from("mindmap_edges").select("*").eq("board_id", boardId),
      ]);
      if (board.data) setTitle(board.data.title);
      const flowNodes: Node[] = (ns.data ?? []).map((n: any) => ({
        id: n.id,
        type: "alios",
        position: { x: n.position_x, y: n.position_y },
        data: { ...(n.data || {}), kind: n.node_type, color: n.color } as NodeData,
        style: n.width ? { width: n.width, height: n.height } : undefined,
      }));
      const flowEdges: Edge[] = (es.data ?? []).map((e: any) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "oklch(0.72 0.18 280 / 0.6)", strokeWidth: 1.5 },
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
    })();
  }, [user, boardId, setNodes, setEdges]);

  const persistNode = useCallback(
    async (n: Node) => {
      if (!user) return;
      const data = n.data as NodeData;
      await supabase.from("mindmap_nodes").upsert({
        id: n.id,
        board_id: boardId,
        user_id: user.id,
        node_type: data.kind,
        position_x: n.position.x,
        position_y: n.position.y,
        data: { text: data.text, url: data.url, imageUrl: data.imageUrl, done: data.done },
        color: data.color ?? null,
      });
    },
    [user, boardId],
  );

  const persistEdge = useCallback(
    async (e: Edge) => {
      if (!user) return;
      await supabase.from("mindmap_edges").upsert({
        id: e.id,
        board_id: boardId,
        user_id: user.id,
        source_node_id: e.source,
        target_node_id: e.target,
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
          persistNode(updated);
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
      await supabase.from("mindmap_nodes").delete().eq("id", id);
      setContextMenu(null);
    },
    [setNodes, setEdges],
  );

  const addNode = useCallback(
    async (position: { x: number; y: number }, kind: NodeKind = "text", data: Partial<NodeData> = {}) => {
      if (!user) return null;
      const id = crypto.randomUUID();
      const newNode: Node = {
        id,
        type: "alios",
        position,
        data: { kind, text: kind === "text" ? "" : undefined, ...data } as NodeData,
      };
      setNodes((nds) => nds.concat(newNode));
      await supabase.from("mindmap_nodes").insert({
        id, board_id: boardId, user_id: user.id, node_type: kind,
        position_x: position.x, position_y: position.y,
        data: { text: data.text, url: data.url, imageUrl: data.imageUrl, done: data.done },
      });
      return id;
    },
    [user, boardId, setNodes],
  );

  // Double-click canvas → new node
  const onPaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(pos, "text");
    },
    [rf, addNode],
  );

  // Drag from handle → release on pane → new connected child
  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connectStartRef.current = { nodeId: params.nodeId ?? null, handleId: params.handleId ?? null };
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event) => {
      const start = connectStartRef.current;
      if (!start?.nodeId) return;
      const target = (event.target as HTMLElement)?.closest(".react-flow__node");
      if (target) return; // Connected to existing node — handled by onConnect
      const ev = event as MouseEvent;
      const pos = rf.screenToFlowPosition({ x: ev.clientX - 90, y: ev.clientY - 30 });
      const newId = await addNode(pos, "text");
      if (!newId) return;
      const edgeId = crypto.randomUUID();
      const newEdge: Edge = {
        id: edgeId,
        source: start.nodeId,
        target: newId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "oklch(0.72 0.18 280 / 0.6)", strokeWidth: 1.5 },
      };
      setEdges((eds) => eds.concat(newEdge));
      persistEdge(newEdge);
    },
    [rf, addNode, setEdges, persistEdge],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      const id = crypto.randomUUID();
      const newEdge: Edge = {
        ...conn,
        id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "oklch(0.72 0.18 280 / 0.6)", strokeWidth: 1.5 },
      } as Edge;
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

  // AI actions
  const aiAction = async (id: string, action: "summarize" | "expand" | "tasks") => {
    const node = nodes.find((n) => n.id === id);
    const text = (node?.data as NodeData)?.text;
    if (!text) return toast.error("No text to process");
    toast.loading("AI thinking…", { id: "ai" });
    try {
      const res = await fetch("/api/ai-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const data = await res.json();
      toast.dismiss("ai");
      if (action === "tasks" && Array.isArray(data.items)) {
        const start = node!.position;
        for (let i = 0; i < data.items.length; i++) {
          const newId = await addNode({ x: start.x + 280, y: start.y + i * 90 }, "task", { text: data.items[i], done: false });
          if (newId) {
            const e: Edge = { id: crypto.randomUUID(), source: id, target: newId, type: "smoothstep", animated: true, style: { stroke: "oklch(0.72 0.18 280 / 0.6)" } };
            setEdges((eds) => eds.concat(e));
            persistEdge(e);
          }
        }
        toast.success(`Created ${data.items.length} tasks`);
      } else if (data.text) {
        const newId = await addNode({ x: node!.position.x + 280, y: node!.position.y }, "text", { text: data.text });
        if (newId) {
          const e: Edge = { id: crypto.randomUUID(), source: id, target: newId, type: "smoothstep", animated: true, style: { stroke: "oklch(0.72 0.18 280 / 0.6)" } };
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

  const nodeTypes = useMemo(
    () => ({
      alios: (props: NodeProps<NodeData>) => (
        <AliosNode {...props} onUpdate={(p) => updateNodeData(props.id, p)} />
      ),
    }),
    [updateNodeData],
  );

  // Save title
  const saveTitle = async (t: string) => {
    setTitle(t);
    await supabase.from("mindmap_boards").update({ title: t }).eq("id", boardId);
  };

  // Persist position on drag stop
  const onNodeDragStop = useCallback((_: any, n: Node) => persistNode(n), [persistNode]);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/mindmap"><Button size="icon" variant="ghost"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <input
            value={title}
            onChange={(e) => saveTitle(e.target.value)}
            className="bg-transparent font-semibold text-base focus:outline-none focus:bg-white/5 rounded px-2 py-1 min-w-0 truncate"
          />
        </div>
        <div className="flex gap-1.5 text-xs text-muted-foreground">
          <span className="hidden md:inline">Double-click to add · Drag handles to connect · Ctrl+V to paste</span>
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 relative" onDoubleClick={onPaneDoubleClick}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={(e, n) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: n.id });
          }}
          onPaneClick={() => setContextMenu(null)}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep", animated: true }}
        >
          <Background color="oklch(1 0 0 / 0.04)" gap={24} size={1} />
          <Controls className="!bg-[oklch(0.18_0.025_265)] !border-white/10 [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-[oklch(0.18_0.025_265)] !border-white/10"
            nodeColor={(n) => (n.data as NodeData)?.color ?? "oklch(0.72 0.18 280)"}
            maskColor="oklch(0.13 0.02 265 / 0.6)"
          />
        </ReactFlow>

        {contextMenu && (
          <div
            className="fixed z-50 glass rounded-lg p-1 min-w-44 text-sm shadow-2xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "summarize")}>AI: Summarize</MenuItem>
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "expand")}>AI: Expand idea</MenuItem>
            <MenuItem icon={Sparkles} onClick={() => aiAction(contextMenu.nodeId, "tasks")}>AI: Convert to tasks</MenuItem>
            <div className="my-1 h-px bg-white/10" />
            <ColorPicker onPick={(c) => { updateNodeData(contextMenu.nodeId, { color: c }); setContextMenu(null); }} />
            <div className="my-1 h-px bg-white/10" />
            <MenuItem icon={Trash2} onClick={() => removeNode(contextMenu.nodeId)} destructive>Delete</MenuItem>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => addNode(rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }), "text")}
          className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/40 flex items-center justify-center text-white hover:scale-105 transition-transform"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, destructive }: { icon: typeof Sparkles; children: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-white/10 ${destructive ? "text-destructive" : ""}`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function ColorPicker({ onPick }: { onPick: (c: string) => void }) {
  const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", null];
  return (
    <div className="flex gap-1.5 px-2 py-1.5">
      {colors.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(c as any)}
          className="h-5 w-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
          style={{ backgroundColor: c ?? "transparent", backgroundImage: c ? undefined : "linear-gradient(135deg,#fff3,transparent)" }}
        />
      ))}
    </div>
  );
}

const KIND_ICON: Record<NodeKind, typeof Brain> = {
  text: Brain,
  image: FileImage,
  link: LinkIcon,
  task: CheckSquare,
};

function AliosNode({ data, id, selected }: NodeProps<NodeData> & { onUpdate?: (p: Partial<NodeData>) => void } & any) {
  const { onUpdate } = (arguments[0] as any);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = KIND_ICON[data.kind] ?? Brain;
  const accent = data.color ?? "oklch(0.72 0.18 280)";

  return (
    <div
      className="group relative rounded-2xl border bg-[oklch(0.2_0.025_265_/_0.85)] backdrop-blur-md min-w-44 max-w-sm shadow-lg"
      style={{
        borderColor: selected ? accent : "oklch(1 0 0 / 0.08)",
        boxShadow: selected ? `0 0 0 1px ${accent}, 0 0 30px -8px ${accent}88` : "0 8px 24px -10px oklch(0 0 0 / 0.4)",
      }}
    >
      {/* 4 connection handles */}
      <Handle type="source" position={Position.Top} id="t" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Right} id="r" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Bottom} id="b" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Left} id="l" className="!h-2.5 !w-2.5 !bg-violet-400 !border-2 !border-background opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Top} id="tt" className="!opacity-0" />
      <Handle type="target" position={Position.Bottom} id="tb" className="!opacity-0" />
      <Handle type="target" position={Position.Left} id="tl" className="!opacity-0" />
      <Handle type="target" position={Position.Right} id="tr" className="!opacity-0" />

      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <Icon className="h-3 w-3 shrink-0" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.kind}</span>
      </div>

      <div className="p-3">
        {data.kind === "image" && data.imageUrl && (
          <img src={data.imageUrl} alt="" className="rounded-md max-w-full max-h-48 object-cover" />
        )}
        {data.kind === "link" && data.url && (
          <a href={data.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
            {data.url}
          </a>
        )}
        {data.kind === "task" && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!data.done} onChange={(e) => onUpdate?.({ done: e.target.checked })} className="mt-1 accent-primary" />
            <span className={data.done ? "line-through text-muted-foreground" : ""}>{data.text || "New task"}</span>
          </label>
        )}
        {(data.kind === "text" || (data.kind === "task" && false)) && (
          editing ? (
            <textarea
              autoFocus
              value={data.text ?? ""}
              onChange={(e) => onUpdate?.({ text: e.target.value })}
              onBlur={() => setEditing(false)}
              rows={3}
              className="w-full bg-transparent text-sm focus:outline-none resize-none"
            />
          ) : (
            <div onDoubleClick={() => setEditing(true)} className="text-sm whitespace-pre-wrap cursor-text min-h-6">
              {data.text
                ? expanded || data.text.length < 140
                  ? data.text
                  : data.text.slice(0, 140) + "…"
                : <span className="text-muted-foreground italic">Double-click to edit</span>}
              {data.text && data.text.length > 140 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                  className="ml-1 text-xs text-primary hover:underline"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )
        )}
        {data.kind === "task" && editing && (
          <input
            autoFocus
            value={data.text ?? ""}
            onChange={(e) => onUpdate?.({ text: e.target.value })}
            onBlur={() => setEditing(false)}
            className="w-full mt-2 bg-transparent text-sm focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
