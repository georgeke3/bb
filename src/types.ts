export interface UserProfile {
  birthDate: string; // ISO string for delivery date
  partnerName: string;
  preferences: string[]; 
  globalContext: string; // Persistent memory for Gemini
}

export interface ContextEvent {
  id: string;
  timestamp: string; // ISO string
  rawInput: string;
  aiSummary: string;
  mood: string;
  symptoms: string[];
}

export interface ToDo {
  id: string;
  title: string;
  description: string;
  isCritical: boolean;
  isComplete: boolean;
  locked: boolean;
  minWeek?: number; // Renamed and optional
  specificDate?: string; // For appointments
  completedAt?: string; // ISO string for heat map
  subTasks: ToDo[];
  parentTaskId: string | null;
  type: 'task' | 'appointment';
}
