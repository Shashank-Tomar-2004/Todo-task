import { AUTH_STORAGE_KEY, BOARD_STORAGE_BACKUP_KEY, BOARD_STORAGE_KEY } from "./constants";
import type {
  ActivityItem,
  AppSettings,
  BoardState,
  ChatMessage,
  DocumentItem,
  Task,
  TaskPriority,
  TaskStatus,
} from "./types";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatus(value: unknown): TaskStatus {
  return value === "todo" || value === "doing" || value === "done" ? value : "todo";
}

function normalizePriority(value: unknown): TaskPriority {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function sanitizeTask(task: Partial<Task>): Task {
  return {
    id: typeof task.id === "string" ? task.id : Math.random().toString(36).slice(2),
    project: typeof task.project === "string" && task.project.trim() ? task.project : "General",
    title: typeof task.title === "string" ? task.title : "Untitled Task",
    description: typeof task.description === "string" ? task.description : "",
    priority: normalizePriority(task.priority),
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    tags: Array.isArray(task.tags) ? task.tags.filter((tag): tag is string => typeof tag === "string") : [],
    status: normalizeStatus(task.status),
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    favorite: typeof task.favorite === "boolean" ? task.favorite : false,
  };
}

function sanitizeActivity(activity: unknown): ActivityItem[] {
  if (!Array.isArray(activity)) return [];
  return activity.filter((item): item is ActivityItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ActivityItem>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.taskTitle === "string" &&
      typeof candidate.timestamp === "string" &&
      (candidate.action === "created" ||
        candidate.action === "edited" ||
        candidate.action === "moved" ||
        candidate.action === "deleted" ||
        candidate.action === "favorited" ||
        candidate.action === "message" ||
        candidate.action === "document")
    );
  });
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatMessage => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ChatMessage>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.text === "string" &&
      typeof candidate.timestamp === "string" &&
      (candidate.sender === "me" || candidate.sender === "teammate")
    );
  });
}

function sanitizeDocuments(value: unknown): DocumentItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DocumentItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<DocumentItem>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.mimeType === "string" &&
      typeof candidate.size === "number" &&
      typeof candidate.uploadedAt === "string" &&
      typeof candidate.dataUrl === "string"
    );
  });
}

function sanitizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return { compactCards: false, showCompleted: true, accent: "teal" };
  }

  const settings = value as Partial<AppSettings>;
  return {
    compactCards: typeof settings.compactCards === "boolean" ? settings.compactCards : false,
    showCompleted: typeof settings.showCompleted === "boolean" ? settings.showCompleted : true,
    accent: settings.accent === "blue" || settings.accent === "orange" || settings.accent === "teal" ? settings.accent : "teal",
  };
}

interface PersistedBoardPayload {
  version: number;
  updatedAt: string;
  state: BoardState;
}

function emptyBoardState(): BoardState {
  return {
    tasks: [],
    activity: [],
    messages: [],
    documents: [],
    settings: { compactCards: false, showCompleted: true, accent: "teal" },
  };
}

function sanitizeBoardState(raw: unknown): BoardState {
  if (!raw || typeof raw !== "object") return emptyBoardState();
  const parsed = raw as Record<string, unknown>;
  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((task) => sanitizeTask(task as Partial<Task>)) : [],
    activity: sanitizeActivity(parsed.activity),
    messages: sanitizeMessages(parsed.messages),
    documents: sanitizeDocuments(parsed.documents),
    settings: sanitizeSettings(parsed.settings),
  };
}

function parsePersistedBoard(raw: string | null): PersistedBoardPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "state" in (parsed as Record<string, unknown>)) {
      const payload = parsed as Partial<PersistedBoardPayload>;
      return {
        version: typeof payload.version === "number" ? payload.version : 1,
        updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date(0).toISOString(),
        state: sanitizeBoardState(payload.state),
      };
    }

    // Backward compatibility for legacy payloads saved directly as BoardState.
    return {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      state: sanitizeBoardState(parsed),
    };
  } catch {
    return null;
  }
}

export function loadBoardState(): BoardState {
  if (typeof window === "undefined") {
    return emptyBoardState();
  }

  const main = parsePersistedBoard(localStorage.getItem(BOARD_STORAGE_KEY));
  const backup = parsePersistedBoard(localStorage.getItem(BOARD_STORAGE_BACKUP_KEY));
  const candidates = [main, backup].filter(Boolean) as PersistedBoardPayload[];

  if (candidates.length === 0) return emptyBoardState();

  candidates.sort((a, b) => {
    if (b.state.tasks.length !== a.state.tasks.length) {
      return b.state.tasks.length - a.state.tasks.length;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return candidates[0].state;
}

export function saveBoardState(state: BoardState) {
  if (typeof window === "undefined") return;
  const payload: PersistedBoardPayload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    state,
  };

  try {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(BOARD_STORAGE_KEY, serialized);
    localStorage.setItem(BOARD_STORAGE_BACKUP_KEY, serialized);
  } catch {
    // If storage is unavailable/quota-bound, keep UI responsive.
  }
}

export interface AuthState {
  email: string;
  rememberMe: boolean;
}

export function loadAuthState(): AuthState | null {
  if (typeof window === "undefined") return null;

  const parsed = safeParse<AuthState | null>(localStorage.getItem(AUTH_STORAGE_KEY), null);
  if (!parsed || typeof parsed.email !== "string" || typeof parsed.rememberMe !== "boolean") {
    return null;
  }

  return parsed;
}

export function saveAuthState(state: AuthState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearAuthState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
