import type { ToDo } from '../types';

export const calculateProgress = (tasks: ToDo[], currentWeek: number) => {
  const allCriticalTasks: ToDo[] = [];
  const weeklyTasks: ToDo[] = [];

  const traverse = (t: ToDo) => {
    if (t.priority !== 'wishlist' && (t.minWeek === undefined || t.minWeek <= currentWeek)) {
      allCriticalTasks.push(t);
    }
    if (t.minWeek === currentWeek) {
      weeklyTasks.push(t);
    }
    t.subTasks.forEach(traverse);
  };

  tasks.forEach(traverse);

  const completedCritical = allCriticalTasks.filter(t => t.isComplete).length;
  const globalProgress = allCriticalTasks.length > 0 ? (completedCritical / allCriticalTasks.length) * 100 : 0;

  const completedWeekly = weeklyTasks.filter(t => t.isComplete).length;
  const weeklyProgress = weeklyTasks.length > 0 ? (completedWeekly / weeklyTasks.length) * 100 : 0;

  return { globalProgress, weeklyProgress };
};
