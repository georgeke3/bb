import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, ContextEvent, ToDo } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  profile: UserProfile | null;
  events: ContextEvent[];
  tasks: ToDo[];
  geminiApiKey: string | null;

  setProfile: (profile: UserProfile) => void;
  setApiKey: (key: string) => void;
  addEvent: (event: Omit<ContextEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;
  
  addTask: (task: Omit<ToDo, 'id' | 'locked' | 'subTasks' | 'parentTaskId'>, parentTaskId?: string) => void;
  updateTask: (id: string, updates: Partial<ToDo>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string, completedAt?: string) => void;
  splitTask: (parentId: string, newSubTasks: Omit<ToDo, 'id' | 'locked' | 'subTasks' | 'parentTaskId'>[]) => void;
  moveTask: (taskId: string, newParentId: string | null) => void;
  
  exportData: () => string;
  importData: (jsonData: string) => void;
  resetData: () => void;
}

const lockTaskAndChildren = (task: ToDo, completedAt?: string): ToDo => {
  const now = completedAt || new Date().toISOString();
  return {
    ...task,
    locked: true,
    isComplete: true,
    completedAt: task.completedAt || now,
    subTasks: task.subTasks.map(t => lockTaskAndChildren(t, now)),
  };
};

const findAndReplaceTask = (tasks: ToDo[], id: string, updater: (task: ToDo) => ToDo | null): ToDo[] => {
  return tasks.reduce((acc: ToDo[], task) => {
    if (task.id === id) {
      const updated = updater(task);
      if (updated) acc.push(updated);
      return acc;
    }
    acc.push({
      ...task,
      subTasks: findAndReplaceTask(task.subTasks, id, updater),
    });
    return acc;
  }, []);
};

const findAndAddTask = (tasks: ToDo[], parentId: string, newTask: ToDo): ToDo[] => {
  return tasks.map((task) => {
    if (task.id === parentId) {
      return {
        ...task,
        subTasks: [...task.subTasks, newTask],
      };
    }
    return {
      ...task,
      subTasks: findAndAddTask(task.subTasks, parentId, newTask),
    };
  });
};

const findTask = (tasks: ToDo[], id: string): ToDo | null => {
  for (const task of tasks) {
    if (task.id === id) return task;
    const found = findTask(task.subTasks, id);
    if (found) return found;
  }
  return null;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      events: [],
      tasks: [],
      geminiApiKey: null,

      setProfile: (profile) => set({ profile }),
      setApiKey: (geminiApiKey) => set({ geminiApiKey }),
      addEvent: (eventData) => set((state) => ({ 
        events: [{ ...eventData, id: uuidv4() }, ...state.events] 
      })),

      deleteEvent: (id) => set((state) => ({
        events: state.events.filter(e => e.id !== id)
      })),

      addTask: (taskData, parentTaskId = undefined) => {
        const newTask: ToDo = {
          ...taskData,
          id: uuidv4(),
          locked: false,
          subTasks: [],
          parentTaskId: parentTaskId || null,
        };

        if (parentTaskId) {
          set((state) => ({
            tasks: findAndAddTask(state.tasks, parentTaskId, newTask),
          }));
        } else {
          set((state) => ({
            tasks: [...state.tasks, newTask],
          }));
        }
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: findAndReplaceTask(state.tasks, id, (task) => ({ ...task, ...updates })),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: findAndReplaceTask(state.tasks, id, () => null),
        }));
      },

      completeTask: (id, completedAt) => {
        set((state) => ({
          tasks: findAndReplaceTask(state.tasks, id, (task) => lockTaskAndChildren(task, completedAt)),
        }));
      },

      splitTask: (parentId, newSubTaskData) => {
        set((state) => ({
          tasks: findAndReplaceTask(state.tasks, parentId, (task) => {
            if (task.locked) return task;
            const newSubTasks: ToDo[] = newSubTaskData.map((data) => ({
              ...data,
              id: uuidv4(),
              locked: false,
              subTasks: [],
              parentTaskId: parentId,
            }));
            return {
              ...task,
              subTasks: [...task.subTasks, ...newSubTasks],
            };
          }),
        }));
      },

      moveTask: (taskId, newParentId) => {
        set((state) => {
          const taskToMove = findTask(state.tasks, taskId);
          if (!taskToMove) return state;

          // 1. Remove task from its current position
          const tasksWithoutTarget = findAndReplaceTask(state.tasks, taskId, () => null);

          // 2. Insert into new parent or root
          const updatedTask = { ...taskToMove, parentTaskId: newParentId };
          
          if (newParentId === null) {
            return { tasks: [...tasksWithoutTarget, updatedTask] };
          } else {
            return { tasks: findAndAddTask(tasksWithoutTarget, newParentId, updatedTask) };
          }
        });
      },

      exportData: () => {
        const state = get();
        return JSON.stringify({
          profile: state.profile,
          events: state.events,
          tasks: state.tasks,
        });
      },

      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          set({
            profile: data.profile || null,
            events: data.events || [],
            tasks: data.tasks || [],
          });
        } catch (e) {
          console.error('Failed to import data', e);
        }
      },

      resetData: () => set({ profile: null, events: [], tasks: [], geminiApiKey: null }),
    }),
    {
      name: 'bb-storage',
    }
  )
);
