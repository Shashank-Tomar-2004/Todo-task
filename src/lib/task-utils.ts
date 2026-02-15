import type { Task, TaskPriority, TaskStatus } from "./types";

export function compareDueDates(a: Task, b: Task, dir: "asc" | "desc" = "asc") {
  const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;

  if (aTime === bTime) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }

  return dir === "asc" ? aTime - bTime : bTime - aTime;
}

export function filterAndSortTasks(
  tasks: Task[],
  searchTerm: string,
  priority: "all" | TaskPriority,
  sortDirection: "asc" | "desc",
) {
  const term = searchTerm.trim().toLowerCase();

  return tasks
    .filter((task) => {
      const matchesTitle = term ? task.title.toLowerCase().includes(term) : true;
      const matchesPriority = priority === "all" ? true : task.priority === priority;
      return matchesTitle && matchesPriority;
    })
    .sort((a, b) => compareDueDates(a, b, sortDirection));
}

export function moveTaskStatus(tasks: Task[], taskId: string, nextStatus: TaskStatus): Task[] {
  return tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: nextStatus,
        }
      : task,
  );
}
