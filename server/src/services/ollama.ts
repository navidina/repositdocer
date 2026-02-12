import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  try {
    const cleanText = text.replace(/\n/g, ' ').trim();
    if (!cleanText) return [];

    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: cleanText, // Note: Ollama API uses 'prompt' for embeddings
    });

    if (response.data && response.data.embedding) {
      return response.data.embedding;
    }
    return [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
};

export const generateCompletion = async (prompt: string, model: string = 'qwen2.5-coder:32b-instruct'): Promise<string> => {
  try {
    // Note: 'generate' endpoint is usually for raw completion, 'chat' for chat.
    // The prompt implies a single turn completion, so 'generate' is fine,
    // but often chat models work better with /api/chat.
    // However, following the instruction to use /api/generate.

    // Check if model name needs adjustment or env var override
    const targetModel = process.env.OLLAMA_MODEL || model;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: targetModel,
      prompt: prompt,
      stream: false,
    });

    if (response.data && response.data.response) {
      return response.data.response;
    }
    return "";
  } catch (error) {
    console.error('Error in generateCompletion:', error);
    throw error;
  }
};
