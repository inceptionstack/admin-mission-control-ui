import { useState, useEffect, useCallback, useRef } from "react";
import { request } from "../api/client";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Archive, ArchiveRestore, GripVertical, RefreshCw, Search, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Maximize2, X, Zap } from "lucide-react";
const apiBase = "";
function getToken() { return localStorage.getItem("id_token") || ""; }

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${apiBase}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}



interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "in-progress" | "done" | "tested";
  priority: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  labels?: string[];
  resolution?: string;
  verifying?: boolean;
}

type Column = "backlog" | "in-progress" | "done" | "tested";

const COLUMNS: { id: Column; label: string; color: string; bg: string }[] = [
  { id: "backlog", label: "📋 Backlog", color: "border-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "in-progress", label: "🔄 In Progress", color: "border-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "done", label: "✅ Done", color: "border-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  { id: "tested", label: "🧪 Tested", color: "border-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
];

const LABELS: { name: string; color: string; bg: string }[] = [
  { name: "infra", color: "text-blue-300", bg: "bg-blue-500/20 border-blue-500/30" },
  { name: "frontend", color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/30" },
  { name: "bug", color: "text-red-300", bg: "bg-red-500/20 border-red-500/30" },
  { name: "security", color: "text-amber-300", bg: "bg-amber-500/20 border-amber-500/30" },
  { name: "ux", color: "text-purple-300", bg: "bg-purple-500/20 border-purple-500/30" },
  { name: "api", color: "text-cyan-300", bg: "bg-cyan-500/20 border-cyan-500/30" },
  { name: "devops", color: "text-orange-300", bg: "bg-orange-500/20 border-orange-500/30" },
];





// ---- Sortable Task Card ----
function TaskCard({
  task,
  onDelete,
  onArchive,
  onUpdate,
  onPush,
  onExpand,
  isPipelineActive,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onUpdate: (id: string, title: string) => void;
  onPush: (id: string, dir: "top" | "bottom") => void;
  onExpand: (task: Task) => void;
  isPipelineActive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const age = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000);
  const truncated = task.title.length > 100 ? task.title.slice(0, 100) + "…" : task.title;

  return (
    <div ref={setNodeRef} style={style} onDoubleClick={() => onExpand(task)} 
      className={`group relative bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 shadow-sm hover:shadow-md transition-all duration-200 ${isDragging ? "ring-2 ring-blue-400 shadow-lg" : ""} ${task.status === "in-progress" ? "ring-1 ring-blue-500/30 shadow-blue-500/10 shadow-lg" : ""} ${isPipelineActive ? "ring-2 ring-amber-400/60 shadow-amber-400/20 shadow-lg animate-pulse" : ""} ${task.verifying ? "ring-2 ring-blue-400/60 shadow-blue-400/20 shadow-lg animate-pulse" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 touch-none shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer select-none leading-snug"
            
          >
            {task.status === "tested" ? "🧪 " : task.status === "done" ? "✅ " : task.status === "in-progress" ? "🔧 " : ""}{truncated}
          </p>
          {task.status === "in-progress" && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-1">⚡ Loki working</span>}
          {task.verifying && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-1 animate-pulse">🔍 Verifying</span>}
          {isPipelineActive && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1">🚀 Deploying</span>}
            {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.labels.map(l => {
                const cfg = LABELS.find(lb => lb.name === l);
                return <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg ? `${cfg.color} ${cfg.bg}` : "text-zinc-400 bg-zinc-500/20 border-zinc-500/30"}`}>{l}</span>;
              })}
            </div>
          )}
          {task.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">{task.description}</p>}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5">
            {age === 0 ? "today" : age === 1 ? "yesterday" : `${age}d ago`}
          </p>
        </div>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onExpand(task)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600" title="Expand"><Maximize2 size={12} /></button>
          <button onClick={() => onPush(task.id, "top")} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600" title="Push to top"><ArrowUp size={12} /></button>
          <button onClick={() => onPush(task.id, "bottom")} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600" title="Push to bottom"><ArrowDown size={12} /></button>
          <button onClick={() => onArchive(task.id, !task.archived)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600" title={task.archived ? "Unarchive" : "Archive"}>
            {task.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500" title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

// ---- Drag Overlay Card (ghost while dragging) ----
function DragOverlayCard({ task }: { task: Task }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border-2 border-blue-400 p-3 shadow-xl rotate-2 scale-105">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
    </div>
  );
}

// ---- Column ----
function BoardColumn({
  column,
  tasks,
  onAdd,
  onDelete,
  onArchive,
  onToggleDone,
  doneCollapsed,
  onUpdate,
  onPush,
  onExpand,
  newTaskCol,
  newTaskText,
  newTaskRef,
  onNewTaskChange,
  onNewTaskSave,
  onNewTaskKeyDown,
  onArchiveAll,
  archivingIds,
  pipelineTaskIds,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onAdd: (status: Column) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onToggleDone?: () => void;
  doneCollapsed?: boolean;
  onUpdate: (id: string, title: string) => void;
  onPush: (id: string, dir: "top" | "bottom") => void;
  onExpand: (task: Task) => void;
  onArchiveAll: (columnStatus: string) => Promise<void>;
  newTaskCol: Column | null;
  newTaskText: string;
  newTaskRef: React.RefObject<HTMLInputElement>;
  onNewTaskChange: (text: string) => void;
  onNewTaskSave: () => void;
  onNewTaskKeyDown: (e: React.KeyboardEvent) => void;
  archivingIds: Set<string>;
  pipelineTaskIds: Set<string>;
}) {
  const { setNodeRef } = useSortable({ id: column.id, data: { type: "column" } });

  return (
    <div className={`flex flex-col min-w-0 rounded-xl ${column.bg} border-t-4 ${column.color}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">
          {column.label}
          <span className="ml-2 text-xs font-normal text-zinc-400">{tasks.length}</span>
        </h3>
        {column.id === "backlog" && (
          <button
            onClick={() => onAdd(column.id)}
            className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Add task"
          >
            <Plus size={16} />
          </button>
        )}
        {column.id === "tested" && tasks.length > 0 && (
          <button
            onClick={async () => {
              const btn = document.getElementById(`archive-btn-${column.id}`);
              if (btn) btn.dataset.loading = "true";
              try { await onArchiveAll(column.id); } finally {
                if (btn) btn.dataset.loading = "false";
              }
            }}
            id={`archive-btn-${column.id}`}
            className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors [&[data-loading=true]]:animate-spin"
            title="Archive all tested"
          >
            <Archive size={16} />
          </button>
        )}
      </div>

      <div ref={setNodeRef} className="flex-1 px-3 pb-3 space-y-2 min-h-[60px] overflow-y-auto max-h-[50vh] xl:max-h-[calc(100vh-250px)]">
        {newTaskCol === column.id && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg border-2 border-blue-400 p-3 shadow-md">
            <input
              ref={newTaskRef}
              value={newTaskText}
              onChange={(e) => onNewTaskChange(e.target.value)}
              onBlur={onNewTaskSave}
              onKeyDown={onNewTaskKeyDown}
              placeholder="Type task title and press Enter..."
              className="w-full bg-transparent outline-none text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              autoFocus
            />
          </div>
        )}
        {!(column.id === "done" && doneCollapsed) && <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <div key={task.id} className={`transition-all duration-400 ${archivingIds.has(task.id) ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
              <TaskCard task={task} onDelete={onDelete} onArchive={onArchive} onUpdate={onUpdate} onPush={onPush} onExpand={onExpand} isPipelineActive={pipelineTaskIds.has(task.id)} />
            </div>
          ))}
        </SortableContext>}
        {tasks.length === 0 && !newTaskCol && (
          <p className="text-xs text-zinc-400 text-center py-8 italic">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

// ---- Main Board ----

// ---- Card Expand Modal ----
function CardExpandModal({ task, onClose, onUpdate }: { task: Task; onClose: () => void; onUpdate: (id: string, data: { title?: string; description?: string; labels?: string[] }) => void }) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || "");
  const [editLabels, setEditLabels] = useState<string[]>(task.labels || []);
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(!!task.description || task.status === "backlog");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", handleEsc, true);
    return () => window.removeEventListener("keydown", handleEsc, true);
  }, [onClose]);

  const handleSave = () => {
    onUpdate(task.id, { title: editTitle.trim() || task.title, description: editDesc, labels: editLabels });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[min(540px,92vw)] p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Edit Task</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Title</label>
          <textarea
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
            autoFocus
          />
        </div>
        {descExpanded ? (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Description (optional)</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={4}
              placeholder="Add more details..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-blue-500 resize-none placeholder-zinc-600"
            />
          </div>
        ) : (
          <button onClick={() => setDescExpanded(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            + Add description
          </button>
        )}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Labels</label>
          <div className="flex flex-wrap gap-1.5">
            {LABELS.map(l => {
              const active = (editLabels || []).includes(l.name);
              return <button key={l.name} type="button" onClick={() => setEditLabels(prev => {
                const cur = prev || [];
                return active ? cur.filter(x => x !== l.name) : [...cur, l.name];
              })} className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active ? `${l.bg} ${l.color}` : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}>{l.name}</button>;
            })}
          </div>
        </div>
        {task.resolution && (
          <div className="space-y-1 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <label className="text-xs text-emerald-400 font-medium">⚡ Loki&apos;s Resolution</label>
            <p className="text-sm text-zinc-300 leading-relaxed">{task.resolution}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-zinc-600 space-y-0.5">
            <p>Created: {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <p>Updated: {new Date(task.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <p>Status: <span className={task.status === "tested" ? "text-purple-400" : task.status === "done" ? "text-emerald-500" : task.status === "in-progress" ? "text-blue-400" : "text-zinc-400"}>{task.status}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">Cancel</button>
            <button onClick={handleSave} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelineTaskIds, setPipelineTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [expandedCard, setExpandedCard] = useState<Task | null>(null);
  const [newTaskCol, setNewTaskCol] = useState<Column | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pushTask = async (id: string, direction: "top" | "bottom") => {
    const colTasks = tasks.filter(t => t.status === tasks.find(x => x.id === id)?.status).sort((a, b) => a.priority - b.priority);
    const targetIndex = direction === "top" ? 0 : colTasks.length - 1;
    try {
      await api(`/api/tasks/${id}/move`, { method: "POST", body: JSON.stringify({ status: tasks.find(t => t.id === id)?.status, index: targetIndex }) });
      await fetchTasks();
    } catch (e) { console.error(e); }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api(`/api/tasks?archived=${showArchived}`);
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [showArchived]);

  useEffect(() => { fetchTasks(); request<{ taskIds: string[] }>("/api/pipelines/active-tasks").then(d => setPipelineTaskIds(new Set(d.taskIds))).catch(() => {}); }, [fetchTasks]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks();
      request<{ taskIds: string[] }>("/api/pipelines/active-tasks").then(d => setPipelineTaskIds(new Set(d.taskIds))).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Keyboard shortcut: N to add new card
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        setNewTaskCol("backlog");
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getColumnTasks = (col: Column) => tasks
    .filter((t) => t.status === col && (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())) && (!labelFilter || (t.labels && t.labels.includes(labelFilter))))
    .sort((a, b) => col === "done"
      ? new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      : a.priority - b.priority);

  const handleAdd = (status: Column) => {
    setNewTaskCol(status);
    setNewTaskText("");
    setTimeout(() => newTaskRef.current?.focus(), 50);
  };

  const handleNewTaskSave = async () => {
    if (!newTaskText.trim() || !newTaskCol) { setNewTaskCol(null); return; }
    try {
      const task = await api("/api/tasks", { method: "POST", body: JSON.stringify({ title: newTaskText.trim(), status: newTaskCol }) });
      setTasks((prev) => [...prev, task]);
    } catch (e) {
      console.error("Create failed", e);
    }
    setNewTaskCol(null);
    setNewTaskText("");
  };

  const handleNewTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNewTaskSave();
    if (e.key === "Escape") { setNewTaskCol(null); setNewTaskText(""); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleArchive = async (id: string, archived: boolean) => {
    try {
      await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify({ archived }) });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archived } : t)));
    } catch (e) {
      console.error("Archive failed", e);
    }
  };

  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());
  const [wakingLoki, setWakingLoki] = useState(false);

  const wakeLoki = async () => {
    setWakingLoki(true);
    try {
      await api("/api/loki/wake", { method: "POST" });
    } catch (e) { console.error("Wake failed", e); }
    finally { setTimeout(() => setWakingLoki(false), 3000); }
  };

  const handleArchiveAllColumn = async (columnStatus: string) => {
    const targetTasks = tasks.filter(t => t.status === columnStatus && !t.archived);
    if (targetTasks.length === 0) return;
    // Start fade-out animation
    setArchivingIds(new Set(targetTasks.map(t => t.id)));
    // Wait for fade animation
    await new Promise(r => setTimeout(r, 400));
    try {
      await Promise.all(targetTasks.map(t => 
        api(`/api/tasks/${t.id}`, { method: "PUT", body: JSON.stringify({ archived: true }) })
      ));
      await fetchTasks();
    } catch (e) {
      console.error("Bulk archive failed", e);
    } finally {
      setArchivingIds(new Set());
    }
  };


  const handleUpdate = async (id: string, title: string) => {
    try {
      await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify({ title }) });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleUpdateFull = async (id: string, data: { title?: string; description?: string; labels?: string[] }) => {
    try {
      await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) });
      await fetchTasks();
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Cross-column drag disabled — only Loki can change task status
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);

    // Only allow reorder within the SAME column
    if (overTask && overTask.status !== activeTask.status) return;
    if (!overTask && COLUMNS.find((c) => c.id === over.id) && over.id !== activeTask.status) return;

    const colTasks = tasks
      .filter((t) => t.status === activeTask.status && t.id !== active.id)
      .sort((a, b) => a.priority - b.priority);

    let newIndex = colTasks.length;
    if (overTask) {
      const overIndex = colTasks.findIndex((t) => t.id === overTask.id);
      if (overIndex !== -1) newIndex = overIndex;
    }

    // Optimistic update — reorder locally before API call
    const reordered = [...colTasks];
    reordered.splice(newIndex, 0, activeTask);
    const updatedTasks = tasks.map((t) => {
      const idx = reordered.findIndex((r) => r.id === t.id);
      if (idx !== -1) return { ...t, priority: idx };
      return t;
    });
    setTasks(updatedTasks);

    try {
      await api(`/api/tasks/${active.id}/move`, {
        method: "POST",
        body: JSON.stringify({ status: activeTask.status, index: newIndex }),
      });
    } catch (e) {
      console.error("Move failed", e);
      await fetchTasks();
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => handleAdd("backlog")}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-1"
          >
            <Plus size={12} />
            New Task
          </button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Task Board</h1>
          <p className="text-sm text-zinc-500 mt-1">Drag tasks between columns to change status. Double-click to edit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              ref={searchRef}
              placeholder="Filter tasks... (/ to search, N to add)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 w-48"
            />
          </div>
          <span className="text-xs text-zinc-500 font-medium">{tasks.filter(t => !t.archived).length} tasks</span>
          <button
            onClick={() => { setLoading(true); fetchTasks(); }}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={wakeLoki}
            disabled={wakingLoki}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              wakingLoki
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-transparent"
            }`}
            title="Wake Loki to start working on tasks now"
          >
            <Zap size={14} className={wakingLoki ? "animate-pulse" : ""} />
            {wakingLoki ? "Waking..." : "Work!"}
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show archived
          </label>
        
          <select
            value={labelFilter || ""}
            onChange={(e) => setLabelFilter(e.target.value || null)}
            className="text-xs px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 cursor-pointer"
          >
            <option value="">All labels</option>
            {LABELS.map(l => (
              <option key={l.name} value={l.name}>{l.name}</option>
            ))}
          </select>
</div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 min-h-0">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onUpdate={handleUpdate}
              newTaskCol={newTaskCol}
              newTaskText={newTaskText}
              newTaskRef={newTaskRef}
              onNewTaskChange={setNewTaskText}
              onNewTaskSave={handleNewTaskSave}
              onNewTaskKeyDown={handleNewTaskKeyDown}
              onPush={pushTask}
              onExpand={setExpandedCard}
              onArchiveAll={handleArchiveAllColumn}
              archivingIds={archivingIds}
              pipelineTaskIds={pipelineTaskIds}
            />
          ))}
        </div>

        <DragOverlay>{activeTask && <DragOverlayCard task={activeTask} />}</DragOverlay>
      </DndContext>
    
      {expandedCard && (
        <CardExpandModal
          task={expandedCard}
          onClose={() => setExpandedCard(null)}
          onUpdate={(id, data) => { handleUpdateFull(id, data); setExpandedCard(null); }}
        />
      )}
</div>
  );
}
