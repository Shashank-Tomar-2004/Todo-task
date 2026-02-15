import { describe, expect, it } from "vitest";
import { filterAndSortTasks, moveTaskStatus } from "./task-utils";
import type { Task } from "./types";

const baseTasks: Task[] = [
  {
    id: "1",
    project: "General",
    title: "Write docs",
    description: "",
    priority: "high",
    dueDate: "2026-02-20",
    tags: [],
    status: "todo",
    createdAt: "2026-02-10T10:00:00.000Z",
    favorite: false,
  },
  {
    id: "2",
    project: "Development",
    title: "Fix bug",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: [],
    status: "doing",
    createdAt: "2026-02-10T09:00:00.000Z",
    favorite: false,
  },
  {
    id: "3",
    project: "Design",
    title: "Design board",
    description: "",
    priority: "high",
    dueDate: "2026-02-18",
    tags: [],
    status: "done",
    createdAt: "2026-02-09T10:00:00.000Z",
    favorite: true,
  },
];

describe("filterAndSortTasks", () => {
  it("sorts by due date and keeps empty due dates last", () => {
    const result = filterAndSortTasks(baseTasks, "", "all", "asc");
    expect(result.map((task) => task.id)).toEqual(["3", "1", "2"]);
  });

  it("filters by search term and priority", () => {
    const result = filterAndSortTasks(baseTasks, "design", "high", "asc");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});

describe("moveTaskStatus", () => {
  it("moves only the targeted task to the next status", () => {
    const result = moveTaskStatus(baseTasks, "1", "done");
    expect(result.find((task) => task.id === "1")?.status).toBe("done");
    expect(result.find((task) => task.id === "2")?.status).toBe("doing");
  });
});
