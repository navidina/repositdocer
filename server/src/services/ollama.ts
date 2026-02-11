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
