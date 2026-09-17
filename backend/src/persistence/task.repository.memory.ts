import type { Task, TaskCycle } from '../types/task-domain.types.js';
import type { TaskRepository } from '../repositories/task.repository.js';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();
  private readonly cycles = new Map<string, TaskCycle>();

  getTask(task_id: string): Promise<Task | null> {
    return Promise.resolve(this.tasks.get(task_id) ?? null);
  }

  listTasks(): Promise<Task[]> {
    const tasks = [...this.tasks.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Promise.resolve(tasks);
  }

  saveTask(task: Task): Promise<void> {
    this.tasks.set(task.task_id, task);
    return Promise.resolve();
  }

  deleteTask(task_id: string): Promise<void> {
    this.tasks.delete(task_id);
    for (const cycle of this.cycles.values()) {
      if (cycle.task_id === task_id) this.cycles.delete(cycle.cycle_id);
    }
    return Promise.resolve();
  }

  getCycle(cycle_id: string): Promise<TaskCycle | null> {
    return Promise.resolve(this.cycles.get(cycle_id) ?? null);
  }

  listCyclesForTask(task_id: string): Promise<TaskCycle[]> {
    const cycles = [...this.cycles.values()]
      .filter((cycle) => cycle.task_id === task_id)
      .sort((a, b) => a.target_date.localeCompare(b.target_date));
    return Promise.resolve(cycles);
  }

  saveCycle(cycle: TaskCycle): Promise<void> {
    this.cycles.set(cycle.cycle_id, cycle);
    return Promise.resolve();
  }
}
