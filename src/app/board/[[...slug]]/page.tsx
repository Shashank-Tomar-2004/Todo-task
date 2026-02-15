"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { clearAuthCookie } from "@/lib/auth";
import { ACTIVITY_LIMIT } from "@/lib/constants";
import { filterAndSortTasks, moveTaskStatus } from "@/lib/task-utils";
import { clearAuthState, loadBoardState, saveBoardState } from "@/lib/storage";
import {
  COLUMN_ORDER,
  type ActivityItem,
  type AppSettings,
  type BoardState,
  type ChatMessage,
  type DocumentItem,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

type BoardAction =
  | { type: "load"; payload: BoardState }
  | { type: "create"; payload: Task }
  | { type: "edit"; payload: Task }
  | { type: "delete"; payload: { id: string } }
  | { type: "move"; payload: { id: string; status: TaskStatus } }
  | { type: "toggleFavorite"; payload: { id: string } }
  | { type: "clearActivity" }
  | { type: "removeActivity"; payload: { id: string } }
  | { type: "addMessage"; payload: ChatMessage }
  | { type: "addDocument"; payload: DocumentItem }
  | { type: "removeDocument"; payload: { id: string } }
  | { type: "updateSettings"; payload: Partial<AppSettings> }
  | { type: "reset" };

type WorkspaceSection = "home" | "my_tasks" | "inbox" | "portfolios" | "goals" | "favorites";
type WorkspaceTab = "overview" | "list" | "board" | "calendar" | "documents" | "messages";
type AccessLevel = "viewer" | "editor" | "admin";

interface DraftTask {
  id?: string;
  project: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  tags: string;
  status: TaskStatus;
}

const initialState: BoardState = {
  tasks: [],
  activity: [],
  messages: [],
  documents: [],
  settings: {
    compactCards: false,
    showCompleted: true,
    accent: "teal",
  },
};

const emptyDraft: DraftTask = {
  project: "General",
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  tags: "",
  status: "todo",
};

const sideItems: Array<{ key: WorkspaceSection; label: string; icon: string }> = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "my_tasks", label: "My Tasks", icon: "◔" },
  { key: "inbox", label: "Inbox", icon: "◡" },
  { key: "portfolios", label: "Portfolios", icon: "▦" },
  { key: "goals", label: "Goals", icon: "◎" },
  { key: "favorites", label: "Favorites", icon: "★" },
];

const topTabs: Array<{ key: WorkspaceTab; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "◌" },
  { key: "list", label: "List", icon: "☰" },
  { key: "board", label: "Board", icon: "◉" },
  { key: "calendar", label: "Calendar", icon: "☷" },
  { key: "documents", label: "Documents", icon: "⌗" },
  { key: "messages", label: "Messages", icon: "◍" },
];

const columnPalette: Record<TaskStatus, string> = {
  todo: "bg-[var(--todo-col)]",
  doing: "bg-[var(--doing-col)]",
  done: "bg-[var(--done-col)]",
};

const priorityStyles: Record<TaskPriority, string> = {
  high: "bg-[var(--pill-high-bg)] text-[var(--pill-high-text)]",
  medium: "bg-[var(--pill-medium-bg)] text-[var(--pill-medium-text)]",
  low: "bg-[var(--pill-low-bg)] text-[var(--pill-low-text)]",
};

const accentMap: Record<AppSettings["accent"], { brand: string; strong: string }> = {
  teal: { brand: "#2b9da0", strong: "#1f7f81" },
  blue: { brand: "#3562ff", strong: "#2447c8" },
  orange: { brand: "#ef8d2d", strong: "#cc6f17" },
};

function makeActivity(action: ActivityItem["action"], taskTitle: string, details?: string): ActivityItem {
  return {
    id: crypto.randomUUID(),
    action,
    taskTitle,
    timestamp: new Date().toISOString(),
    details,
  };
}

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "load":
      return action.payload;
    case "create":
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
        activity: [makeActivity("created", action.payload.title), ...state.activity].slice(0, ACTIVITY_LIMIT),
      };
    case "edit":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.payload.id ? action.payload : task)),
        activity: [makeActivity("edited", action.payload.title), ...state.activity].slice(0, ACTIVITY_LIMIT),
      };
    case "delete": {
      const target = state.tasks.find((task) => task.id === action.payload.id);
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload.id),
        activity: target
          ? [makeActivity("deleted", target.title), ...state.activity].slice(0, ACTIVITY_LIMIT)
          : state.activity,
      };
    }
    case "move": {
      const current = state.tasks.find((task) => task.id === action.payload.id);
      if (!current || current.status === action.payload.status) return state;

      return {
        ...state,
        tasks: moveTaskStatus(state.tasks, action.payload.id, action.payload.status),
        activity: [
          makeActivity("moved", current.title, `${current.status.toUpperCase()} -> ${action.payload.status.toUpperCase()}`),
          ...state.activity,
        ].slice(0, ACTIVITY_LIMIT),
      };
    }
    case "toggleFavorite": {
      const current = state.tasks.find((task) => task.id === action.payload.id);
      if (!current) return state;
      const next = !current.favorite;

      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.payload.id ? { ...task, favorite: next } : task)),
        activity: [
          makeActivity("favorited", current.title, next ? "Added to favorites" : "Removed from favorites"),
          ...state.activity,
        ].slice(0, ACTIVITY_LIMIT),
      };
    }
    case "clearActivity":
      return { ...state, activity: [] };
    case "removeActivity":
      return { ...state, activity: state.activity.filter((item) => item.id !== action.payload.id) };
    case "addMessage":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        activity: [
          makeActivity("message", action.payload.sender === "me" ? "You" : "Teammate", action.payload.text),
          ...state.activity,
        ].slice(0, ACTIVITY_LIMIT),
      };
    case "addDocument":
      return {
        ...state,
        documents: [action.payload, ...state.documents],
        activity: [makeActivity("document", action.payload.name, "Document uploaded"), ...state.activity].slice(0, ACTIVITY_LIMIT),
      };
    case "removeDocument":
      return { ...state, documents: state.documents.filter((doc) => doc.id !== action.payload.id) };
    case "updateSettings":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case "reset":
      return {
        ...state,
        tasks: [],
        activity: [],
      };
    default:
      return state;
  }
}

function toDraft(task: Task): DraftTask {
  return {
    id: task.id,
    project: task.project,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags.join(", "),
    status: task.status,
  };
}

function toBytes(size: number): string {
  if (size > 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function getMonthGrid(anchorDate: Date): Date[] {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function asSection(value: string | undefined): WorkspaceSection {
  return sideItems.some((item) => item.key === value) ? (value as WorkspaceSection) : "home";
}

function asTab(value: string | undefined): WorkspaceTab {
  return topTabs.some((tab) => tab.key === value) ? (value as WorkspaceTab) : "board";
}

function parseBoardRoute(slug: string[] | undefined): {
  section: WorkspaceSection;
  tab: WorkspaceTab;
  project: string | null;
} {
  if (!slug || slug.length === 0) {
    return { section: "home", tab: "board", project: null };
  }

  if (slug[0] === "project" && slug[1]) {
    return {
      section: "portfolios",
      tab: asTab(slug[2]),
      project: decodeURIComponent(slug[1]),
    };
  }

  return {
    section: asSection(slug[0]),
    tab: asTab(slug[1]),
    project: null,
  };
}

export default function BoardPage() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const hasLoadedRef = useRef(false);
  const routeState = parseBoardRoute(params.slug);
  const activeSection = routeState.section;
  const activeTab = routeState.tab;
  const activeProject = routeState.project;
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState<DraftTask>(emptyDraft);
  const [searchTerm, setSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formError, setFormError] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<AccessLevel>("viewer");

  const [messageInput, setMessageInput] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().slice(0, 10));

  const [documentBusy, setDocumentBusy] = useState(false);

  const goTo = (section: WorkspaceSection, tab: WorkspaceTab) => {
    router.push(`/board/${section}/${tab}`);
  };

  const goToProject = (project: string, tab: WorkspaceTab = "board") => {
    router.push(`/board/project/${encodeURIComponent(project)}/${tab}`);
  };

  const handleSectionNavigate = (section: WorkspaceSection) => {
    goTo(section, "board");
    const label = sideItems.find((item) => item.key === section)?.label ?? section;
    setNotice(`${label} view loaded`);
  };

  useEffect(() => {
    const loaded = loadBoardState();
    dispatch({ type: "load", payload: loaded });
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveBoardState(state);
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const accent = accentMap[state.settings.accent];
    document.documentElement.style.setProperty("--brand", accent.brand);
    document.documentElement.style.setProperty("--brand-strong", accent.strong);
  }, [state.settings.accent]);

  const filteredTasks = useMemo(
    () => filterAndSortTasks(state.tasks, searchTerm, priorityFilter, sortDirection),
    [state.tasks, searchTerm, priorityFilter, sortDirection],
  );

  const projectOptions = useMemo(() => {
    const set = new Set<string>(["General", "Personal", "Design", "Development", "Marketing"]);
    state.tasks.forEach((task) => set.add(task.project));
    return Array.from(set);
  }, [state.tasks]);

  const projectPortals = useMemo(() => {
    const set = new Set<string>();
    state.tasks.forEach((task) => set.add(task.project));
    return Array.from(set);
  }, [state.tasks]);

  const sectionTasks = useMemo(() => {
    const term = globalSearchTerm.trim().toLowerCase();

    const base = filteredTasks.filter((task) => {
      if (!state.settings.showCompleted && task.status === "done") return false;
      if (projectFilter !== "all" && task.project !== projectFilter) return false;
      if (activeProject && task.project !== activeProject) return false;
      if (!term) return true;
      return task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term);
    });

    switch (activeSection) {
      case "my_tasks":
        return base.filter((task) => task.project === "Personal" || task.favorite);
      case "inbox":
        return base.filter((task) => task.status === "todo" || task.priority === "high");
      case "portfolios":
        return base.filter((task) => task.project !== "General");
      case "goals":
        return base.filter((task) => task.status !== "done" && task.dueDate.length > 0);
      case "favorites":
        return base.filter((task) => task.favorite);
      default:
        return base;
    }
  }, [activeProject, activeSection, filteredTasks, globalSearchTerm, projectFilter, state.settings.showCompleted]);

  const groupedColumns = useMemo(
    () =>
      COLUMN_ORDER.reduce(
        (acc, status) => {
          acc[status] = sectionTasks.filter((task) => task.status === status);
          return acc;
        },
        {
          todo: [] as Task[],
          doing: [] as Task[],
          done: [] as Task[],
        },
      ),
    [sectionTasks],
  );

  const summary = useMemo(() => {
    const total = sectionTasks.length;
    const todo = sectionTasks.filter((task) => task.status === "todo").length;
    const doing = sectionTasks.filter((task) => task.status === "doing").length;
    const done = sectionTasks.filter((task) => task.status === "done").length;
    const favorites = sectionTasks.filter((task) => task.favorite).length;
    return { total, todo, doing, done, favorites };
  }, [sectionTasks]);

  const monthGrid = useMemo(() => getMonthGrid(calendarMonth), [calendarMonth]);

  const tasksByDueDate = useMemo(
    () =>
      sectionTasks.reduce<Record<string, Task[]>>((acc, task) => {
        if (!task.dueDate) return acc;
        if (!acc[task.dueDate]) acc[task.dueDate] = [];
        acc[task.dueDate].push(task);
        return acc;
      }, {}),
    [sectionTasks],
  );

  const selectedDayTasks = tasksByDueDate[selectedDay] ?? [];

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!draft.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    const now = new Date().toISOString();
    const existing = draft.id ? state.tasks.find((task) => task.id === draft.id) : undefined;

    const nextTask: Task = {
      id: draft.id ?? crypto.randomUUID(),
      project: activeProject ?? (draft.project.trim() || "General"),
      title: draft.title.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      dueDate: draft.dueDate,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: draft.status,
      createdAt: existing?.createdAt ?? now,
      favorite: existing?.favorite ?? false,
    };

    dispatch({ type: draft.id ? "edit" : "create", payload: nextTask });
    setDraft(emptyDraft);
    if (activeProject) {
      goToProject(activeProject, "board");
    } else {
      goTo("home", "board");
    }
    setSearchTerm("");
    setGlobalSearchTerm("");
    setNotice(draft.id ? "Task updated" : "Task added to board");
  };

  const startEdit = (task: Task) => {
    setDraft(toDraft(task));
    if (activeProject) {
      goToProject(activeProject, "board");
    } else {
      goTo(activeSection, "board");
    }
    setFormError("");
  };

  const resetBoard = () => {
    if (!confirm("Reset board and delete all tasks?")) return;
    dispatch({ type: "reset" });
    setNotice("Board reset");
  };

  const clearActivityLog = () => {
    dispatch({ type: "clearActivity" });
    setNotice("Activity log cleared");
  };

  const logout = () => {
    clearAuthState();
    clearAuthCookie();
    window.location.href = "/login";
  };

  const onDropToColumn = (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    if (!taskId) return;
    dispatch({ type: "move", payload: { id: taskId, status } });
  };

  const handleInviteSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setShowInviteModal(false);
    setNotice(`Invite sent to ${inviteEmail} (${inviteAccess})`);
    setInviteEmail("");
    setInviteAccess("viewer");
  };

  const handleShareCopy = async () => {
    const text = `Task board snapshot: ${summary.total} tasks (${summary.todo} todo, ${summary.doing} doing, ${summary.done} done)`;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Share summary copied");
      setShowShareModal(false);
    } catch {
      setNotice("Copy failed");
    }
  };

  const handleSettingsSave = (event: React.FormEvent) => {
    event.preventDefault();
    setShowSettingsModal(false);
    setNotice("Settings saved locally");
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text) return;

    const mine: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "me",
      text,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: "addMessage", payload: mine });
    setMessageInput("");

    setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "teammate",
        text: `Received: ${text.slice(0, 48)}`,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "addMessage", payload: reply });
    }, 450);
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const doc: DocumentItem = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl,
      };
      dispatch({ type: "addDocument", payload: doc });
      setNotice(`Uploaded ${file.name}`);
    } catch {
      setNotice("Upload failed");
    } finally {
      setDocumentBusy(false);
      event.target.value = "";
    }
  };

  const downloadDocument = (doc: DocumentItem) => {
    const link = document.createElement("a");
    link.href = doc.dataUrl;
    link.download = doc.name;
    link.click();
  };

  const sectionTitle = sideItems.find((item) => item.key === activeSection)?.label ?? "Home";
  const projectTitle = activeProject ? `Project Portal: ${activeProject}` : sectionTitle;

  const renderTaskCard = (task: Task) => (
    <div
      key={task.id}
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
      className={`rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm ${state.settings.compactCards ? "text-xs" : "text-sm"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{task.title}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[task.priority]}`}>{task.priority}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">
        {task.description || "Note: Add details for implementation and follow-up."}
      </p>

      <div className="mt-2 text-[11px] text-[var(--muted)]">Project: {task.project}</div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">Due: {task.dueDate || "-"}</div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1">
          <span className="h-4 w-4 rounded-full border border-[var(--panel)] bg-[#e9a6a6]" />
          <span className="h-4 w-4 rounded-full border border-[var(--panel)] bg-[#9ccde0]" />
          <span className="h-4 w-4 rounded-full border border-[var(--panel)] bg-[#e8c89f]" />
        </div>
        <div className="text-[10px] text-[var(--muted)]">📄 {task.tags.length}  💬 {task.description ? 1 : 0}</div>
      </div>

      <div className="mt-2 flex gap-1">
        <button onClick={() => startEdit(task)} className="rounded border border-[var(--border)] px-2 py-1 text-[11px]">Edit</button>
        <button onClick={() => dispatch({ type: "toggleFavorite", payload: { id: task.id } })} className="rounded border border-[var(--border)] px-2 py-1 text-[11px]">{task.favorite ? "★" : "☆"}</button>
        <button onClick={() => dispatch({ type: "delete", payload: { id: task.id } })} className="rounded border border-[var(--danger)] px-2 py-1 text-[11px] text-[var(--danger)]">Delete</button>
      </div>
    </div>
  );

  return (
    <main className="mx-auto h-screen max-w-[1740px] px-4 py-4 md:px-6">
      <div className="surface rise-in h-[calc(100vh-2rem)] overflow-hidden">
        <div className="grid h-full lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-[var(--border)] bg-[var(--panel-soft)] p-4 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--brand)]" />
                <span className="font-semibold">turbo</span>
              </div>

              <nav className="space-y-1">
                {sideItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSectionNavigate(item.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      activeSection === item.key ? "bg-[var(--panel)] font-medium" : "text-[var(--muted)] hover:bg-[var(--panel)]"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <button type="button" onClick={() => setShowInviteModal(true)} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">Invite teammates</button>
          </aside>

          <div className="flex h-full min-h-0 flex-col p-4 md:p-6">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{projectTitle}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span>Section: {sectionTitle}</span>
                  <span>Total Tasks: {summary.total}</span>
                  <span className="rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-[var(--brand)]">{summary.todo} Active</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  placeholder="Search globally"
                  className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-sm"
                />
                <button onClick={() => setShowShareModal(true)} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs">Share</button>
                <button onClick={() => setShowSettingsModal(true)} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs">Settings</button>
                <button onClick={() => setShowInviteModal(true)} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5 text-xs">Invite</button>
                <ThemeToggle />
                <button onClick={logout} className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2 text-sm">Logout</button>
              </div>
            </header>

            <div className="mb-3 flex flex-wrap gap-2 rounded-full bg-[var(--panel-soft)] p-1">
              {topTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => (activeProject ? goToProject(activeProject, tab.key) : goTo(activeSection, tab.key))}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                    activeTab === tab.key
                      ? "bg-[#f1cc58] font-semibold text-slate-900"
                      : "border border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--panel)]"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {notice && <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm">{notice}</div>}

            {activeSection === "portfolios" && !activeProject && (
              <section className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Project Portals</h3>
                  <span className="text-xs text-[var(--muted)]">Open a dedicated project board + calendar</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {projectPortals.map((project) => (
                    <button
                      key={project}
                      onClick={() => goToProject(project, "board")}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-left text-sm hover:border-[var(--brand)]"
                    >
                      {project}
                    </button>
                  ))}
                  {projectPortals.length === 0 && <p className="text-sm text-[var(--muted)]">Create tasks with project names to generate portals.</p>}
                </div>
              </section>
            )}

            <section className="mb-3 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search task" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5">
                <option value="all">All projects</option>
                {projectOptions.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as "all" | TaskPriority)} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
              <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"><option value="asc">Sort by due date (asc)</option><option value="desc">Sort by due date (desc)</option></select>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setProjectFilter("all");
                  setPriorityFilter("all");
                  setSortDirection("asc");
                  setNotice("Filters cleared");
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-sm"
              >
                Clear
              </button>
              <button onClick={() => (activeProject ? goToProject(activeProject, "board") : goTo(activeSection, "board"))} className="rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-semibold text-white">+ Add New Task</button>
            </section>

            {activeProject && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <button onClick={() => goTo("portfolios", "board")} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-1">
                  Back to Portfolios
                </button>
                <span className="rounded-full bg-[var(--panel-soft)] px-3 py-1">Portal: {activeProject}</span>
                <button onClick={() => goToProject(activeProject, "calendar")} className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2 py-1">
                  Project Calendar
                </button>
              </div>
            )}

            <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_1fr]">
              <aside className="flex min-h-0 flex-col gap-3">
                <form onSubmit={addTask} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <h2 className="mb-3 text-lg font-semibold">{draft.id ? "Edit Task" : "Create Task"}</h2>

                  <div className="space-y-3">
                    {activeProject ? (
                      <input value={activeProject} readOnly className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
                    ) : (
                      <select value={draft.project} onChange={(e) => setDraft((prev) => ({ ...prev, project: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5">
                        {projectOptions.map((project) => (
                          <option key={project} value={project}>{project}</option>
                        ))}
                        {!projectOptions.includes(draft.project) && <option value={draft.project}>{draft.project}</option>}
                      </select>
                    )}
                    <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title *" className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
                    <textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={draft.priority} onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                      <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as TaskStatus }))} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"><option value="todo">Todo</option><option value="doing">Doing</option><option value="done">Done</option></select>
                    </div>
                    <input type="date" value={draft.dueDate} onChange={(e) => setDraft((prev) => ({ ...prev, dueDate: e.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
                    <input value={draft.tags} onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags (comma separated)" className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" />
                  </div>

                  {formError && <p className="mt-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{formError}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="submit" className="rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">{draft.id ? "Save Changes" : "Add Task"}</button>
                    {draft.id && <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">Cancel</button>}
                    <button type="button" onClick={resetBoard} className="rounded-xl border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">Reset Board</button>
                  </div>
                </form>

              </aside>

              <section className="min-h-0">
                {activeTab === "overview" && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-xs text-[var(--muted)]">Total</p><p className="text-2xl font-semibold">{summary.total}</p></div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-xs text-[var(--muted)]">Todo</p><p className="text-2xl font-semibold">{summary.todo}</p></div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-xs text-[var(--muted)]">Doing</p><p className="text-2xl font-semibold">{summary.doing}</p></div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-xs text-[var(--muted)]">Done</p><p className="text-2xl font-semibold">{summary.done}</p></div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><p className="text-xs text-[var(--muted)]">Favorites</p><p className="text-2xl font-semibold">{summary.favorites}</p></div>
                  </div>
                )}

                {activeTab === "list" && (
                  <div className="h-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead><tr className="text-[var(--muted)]"><th className="px-2 py-2">Task</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Due</th><th className="px-2 py-2">Actions</th></tr></thead>
                      <tbody>
                        {sectionTasks.map((task) => (
                          <tr key={task.id} className="border-t border-[var(--border)]">
                            <td className="px-2 py-2">{task.title}</td>
                            <td className="px-2 py-2 capitalize">{task.status}</td>
                            <td className="px-2 py-2">{task.dueDate || "-"}</td>
                            <td className="px-2 py-2"><div className="flex gap-2"><button onClick={() => startEdit(task)} className="rounded border border-[var(--border)] px-2 py-1">Edit</button><button onClick={() => dispatch({ type: "delete", payload: { id: task.id } })} className="rounded border border-[var(--danger)] px-2 py-1 text-[var(--danger)]">Delete</button></div></td>
                          </tr>
                        ))}
                        {sectionTasks.length === 0 && <tr><td colSpan={4} className="px-2 py-4 text-[var(--muted)]">No tasks found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "board" && (
                  <section className="grid h-full min-h-0 gap-3 md:grid-cols-3">
                    {COLUMN_ORDER.map((status) => (
                      <article key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropToColumn(event, status)} className={`${columnPalette[status]} flex min-h-0 flex-col rounded-2xl border border-[var(--border)] p-3`}>
                        <h3 className="mb-3 text-lg font-semibold capitalize">{status}</h3>
                        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">{groupedColumns[status].length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)]/70 p-3 text-sm text-[var(--muted)]">Drop tasks here</p> : groupedColumns[status].map((task) => renderTaskCard(task))}</div>
                      </article>
                    ))}
                  </section>
                )}

                {activeTab === "calendar" && (
                  <section className="grid h-full min-h-0 gap-3 lg:grid-cols-[2fr_1fr]">
                    <div className="h-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold">{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
                        <div className="flex gap-2"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded border border-[var(--border)] px-2 py-1 text-xs">Prev</button><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded border border-[var(--border)] px-2 py-1 text-xs">Next</button></div>
                      </div>
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-[var(--muted)]">{"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => <div key={d}>{d}</div>)}</div>
                      <div className="mt-2 grid grid-cols-7 gap-2">
                        {monthGrid.map((day) => {
                          const key = day.toISOString().slice(0, 10);
                          const count = (tasksByDueDate[key] ?? []).length;
                          const inMonth = day.getMonth() === calendarMonth.getMonth();
                          const selected = key === selectedDay;
                          return (
                            <button
                              key={key}
                              onClick={() => setSelectedDay(key)}
                              className={`min-h-[78px] rounded-xl border border-[var(--border)] p-2 text-left text-xs ${selected ? "ring-2 ring-[var(--brand)]" : ""} ${inMonth ? "bg-[var(--panel)]" : "bg-[var(--panel-soft)] opacity-60"}`}
                            >
                              <div className="font-medium">{day.getDate()}</div>
                              {count > 0 && <div className="mt-1 rounded bg-[var(--panel-soft)] px-1 py-0.5 text-[10px]">{count} task{count > 1 ? "s" : ""}</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                      <h4 className="font-semibold">{selectedDay}</h4>
                      <p className="mb-2 text-xs text-[var(--muted)]">Tasks due on selected day</p>
                      <div className="space-y-2">{selectedDayTasks.length === 0 ? <p className="text-sm text-[var(--muted)]">No tasks due on this day.</p> : selectedDayTasks.map((task) => renderTaskCard(task))}</div>
                    </div>
                  </section>
                )}

                {activeTab === "documents" && (
                  <section className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_2fr]">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                      <h3 className="mb-2 text-lg font-semibold">Upload Document</h3>
                      <p className="mb-3 text-sm text-[var(--muted)]">Stored locally in browser storage only.</p>
                      <input type="file" onChange={uploadDocument} className="w-full text-sm" />
                      {documentBusy && <p className="mt-2 text-sm text-[var(--muted)]">Uploading...</p>}
                    </div>

                    <div className="h-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                      <h3 className="mb-2 text-lg font-semibold">Documents</h3>
                      <div className="space-y-2">
                        {state.documents.map((doc) => (
                          <div key={doc.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
                            <div className="font-medium">{doc.name}</div>
                            <div className="text-xs text-[var(--muted)]">{toBytes(doc.size)} • {new Date(doc.uploadedAt).toLocaleString()}</div>
                            <div className="mt-2 flex gap-2"><button onClick={() => downloadDocument(doc)} className="rounded border border-[var(--border)] px-2 py-1 text-xs">Download</button><button onClick={() => dispatch({ type: "removeDocument", payload: { id: doc.id } })} className="rounded border border-[var(--danger)] px-2 py-1 text-xs text-[var(--danger)]">Delete</button></div>
                          </div>
                        ))}
                        {state.documents.length === 0 && <p className="text-sm text-[var(--muted)]">No documents uploaded yet.</p>}
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === "messages" && (
                  <section className="grid h-full min-h-0 gap-3 lg:grid-cols-[2fr_1.2fr]">
                    <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                      <h3 className="mb-2 text-lg font-semibold">Messages</h3>
                      <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                        {state.messages.map((msg) => (
                          <div key={msg.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.sender === "me" ? "ml-auto bg-[var(--brand)] text-white" : "bg-[var(--panel)]"}`}>
                            <div>{msg.text}</div>
                            <div className={`mt-1 text-[10px] ${msg.sender === "me" ? "text-white/80" : "text-[var(--muted)]"}`}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                          </div>
                        ))}
                        {state.messages.length === 0 && <p className="text-sm text-[var(--muted)]">No messages yet. Send one.</p>}
                      </div>
                      <div className="mt-3 flex gap-2"><input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Type a message" className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5" /><button onClick={sendMessage} className="rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">Send</button></div>
                    </div>

                    <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                      <div className="mb-2 flex items-center justify-between"><h3 className="text-lg font-semibold">Activity</h3><button onClick={clearActivityLog} className="rounded border border-[var(--border)] px-2 py-1 text-xs">Clear All</button></div>
                      <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                        {state.activity.map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
                            <div className="text-sm"><span className="capitalize">{item.action}</span> {item.taskTitle}</div>
                            {item.details && <div className="text-xs text-[var(--muted)]">{item.details}</div>}
                            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--muted)]"><span>{new Date(item.timestamp).toLocaleString()}</span><button onClick={() => dispatch({ type: "removeActivity", payload: { id: item.id } })} className="rounded border border-[var(--border)] px-1.5 py-0.5">Clear</button></div>
                          </div>
                        ))}
                        {state.activity.length === 0 && <p className="text-sm text-[var(--muted)]">No activity yet.</p>}
                      </div>
                    </div>
                  </section>
                )}
              </section>
            </section>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">Invite Teammate</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">No backend: invite is local-only.</p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3"><input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@email.com" className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5" /><select value={inviteAccess} onChange={(e) => setInviteAccess(e.target.value as AccessLevel)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowInviteModal(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">Invite</button></div></form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">Settings</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Saved locally in browser storage.</p>
            <form onSubmit={handleSettingsSave} className="mt-4 space-y-3">
              <label className="flex items-center justify-between"><span className="text-sm">Compact cards</span><input type="checkbox" checked={state.settings.compactCards} onChange={(e) => dispatch({ type: "updateSettings", payload: { compactCards: e.target.checked } })} /></label>
              <label className="flex items-center justify-between"><span className="text-sm">Show completed tasks</span><input type="checkbox" checked={state.settings.showCompleted} onChange={(e) => dispatch({ type: "updateSettings", payload: { showCompleted: e.target.checked } })} /></label>
              <label className="block text-sm">Accent color<select value={state.settings.accent} onChange={(e) => dispatch({ type: "updateSettings", payload: { accent: e.target.value as AppSettings["accent"] } })} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5"><option value="teal">Teal</option><option value="blue">Blue</option><option value="orange">Orange</option></select></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowSettingsModal(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">Share</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Create a local share summary.</p>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-sm">{`Board snapshot: ${summary.total} tasks (${summary.todo} todo, ${summary.doing} doing, ${summary.done} done)`}</div>
            <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowShareModal(false)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Close</button><button onClick={handleShareCopy} className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">Copy</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
