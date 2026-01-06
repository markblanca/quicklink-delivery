
import { GoogleGenAI } from "@google/genai";
import { Service, Rider } from "../types";

// Fixed: Use named parameter with process.env.API_KEY directly as required by guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeEfficiency = async (services: Service[], riders: Rider[]) => {
  // Fixed: Removed unnecessary API key presence check as the key is assumed to be available
  const prompt = `
    Analyze the following delivery data and provide a concise 3-sentence summary in Spanish about today's performance and suggestions.
    Riders: ${JSON.stringify(riders.map(r => ({ name: r.name, status: r.status })))}
    Completed Services today: ${services.filter(s => s.status === 'COMPLETED').length}
    Total Value: ${services.filter(s => s.status === 'COMPLETED').reduce((acc, s) => acc + s.value, 0)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fixed: Accessed .text property (not a method) from GenerateContentResponse
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights.";
  }
};
