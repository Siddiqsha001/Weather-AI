import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with error handling
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_KEY);
} catch (err) {
  console.error("Failed to initialize Gemini:", err);
  throw new Error("AI initialization failed");
}

export const getEmbedding = async (text) => {
  if (!genAI) throw new Error("Gemini not initialized");
  if (!text?.trim()) throw new Error("Empty text");

  try {
    const model = genAI.getGenerativeModel({ 
      model: "embedding-001",
      requestOptions: { timeout: 10000 } // 10s timeout
    });
    
    const result = await model.embedContent(text);
    return result.embedding?.values || [];
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};