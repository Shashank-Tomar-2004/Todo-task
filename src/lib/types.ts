export const COLUMN_ORDER = ["todo", "doing", "done"] as const;

export type TaskStatus = (typeof COLUMN_ORDER)[number];
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  project: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  tags: string[];
  status: TaskStatus;
  createdAt: string;
  favorite: boolean;
}

export interface ActivityItem {
  id: string;
  action: "created" | "edited" | "moved" | "deleted" | "favorited" | "message" | "document";
  taskTitle: string;
  timestamp: string;
  details?: string;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "teammate";
  text: string;
  timestamp: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

export interface AppSettings {
  compactCards: boolean;
  showCompleted: boolean;
  accent: "teal" | "blue" | "orange";
}

export interface BoardState {
  tasks: Task[];
  activity: ActivityItem[];
  messages: ChatMessage[];
  documents: DocumentItem[];
  settings: AppSettings;
}
