import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ToDo } from '../types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private globalContext: string;

  constructor(apiKey: string, globalContext: string = '') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', 
    });
    this.globalContext = globalContext;
  }

  private getSystemPrompt(role: string) {
    return `
      Global Context/User Memory: "${this.globalContext}"
      
      Role: ${role}
    `;
  }

  async parseDailyEvent(input: string) {
    const prompt = `
      ${this.getSystemPrompt('Medical data parser for a pregnancy tracker.')}
      
      Analyze the following raw text input about how a pregnant partner is doing.
      Extract symptoms, mood, and provide a 1-sentence context summary.
      
      Input: "${input}"
      
      Return JSON:
      - symptoms: string[] (empty if none)
      - mood: string
      - aiSummary: string
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Gemini error:', error);
      throw error;
    }
  }

  async getRecommendations(currentWeek: number, recentEvents: any[], incompleteTasks: ToDo[]) {
    const prompt = `
      ${this.getSystemPrompt('Empathetic, proactive pregnancy assistant.')}
      
      Based on the current context, suggest 3 highly personalized "Nice to Have" tasks.
      
      Current Week: ${currentWeek}
      Recent Events: ${JSON.stringify(recentEvents.slice(0, 3))}
      Existing Incomplete Tasks: ${JSON.stringify(incompleteTasks.map(t => ({ title: t.title, minWeek: t.minWeek })))}
      
      Return JSON array of objects:
      - title: string
      - description: string
      - minWeek: number (set to ${currentWeek} or ${currentWeek + 1})
      - isCritical: boolean (false)
      - type: "task"
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Gemini error:', error);
      throw error;
    }
  }

  async splitTask(taskTitle: string, taskDescription: string, currentWeek: number) {
    const prompt = `
      ${this.getSystemPrompt('Project manager specializing in prenatal logistics.')}
      
      Break down the goal into hierarchical sub-tasks.
      Goal: "${taskTitle}"
      Description: "${taskDescription}"
      Current Week: ${currentWeek}
      
      Return JSON array of objects:
      - title: string
      - description: string
      - minWeek: number
      - isCritical: boolean
      - type: "task"
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error: any) {
      console.error('Gemini error:', error);
      throw error;
    }
  }
}
