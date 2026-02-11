import { VectorDocument, OllamaConfig, SearchResult, ProcessedFile } from '../types';

const BACKEND_URL = 'http://localhost:3000/api'; // In production, this should be an environment variable

/**
 * A Centralized Vector Store for RAG, powered by the backend (PostgreSQL + pgvector).
 * This replaces the client-side IndexedDB implementation.
 */
export class CentralVectorStore {
  private config: OllamaConfig;
  private apiUrl: string;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.apiUrl = BACKEND_URL;
  }

  /**
   * Adds processed files to the central database.
   * The backend handles chunking and embedding generation.
   */
  async addDocuments(projectId: string, files: ProcessedFile[], onProgress?: (current: number, total: number) => void): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/vectors/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, documents: files })
      });

      if (!response.ok) {
        throw new Error(`Failed to index documents: ${response.statusText}`);
      }

      // Backend handles it in one go, but we can simulate progress or just callback done.
      if (onProgress) onProgress(files.length, files.length);

    } catch (error) {
      console.error('Error adding documents to central store:', error);
      throw error;
    }
  }

  /**
   * Performs a similarity search on the central database.
   */
  async search(projectId: string, query: string, topK: number = 5): Promise<VectorDocument[]> {
    try {
      const response = await fetch(`${this.apiUrl}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, query, topK })
      });

      if (!response.ok) {
         throw new Error(`Search failed: ${response.statusText}`);
      }

      const results = await response.json();
      
      // Map backend results to VectorDocument format
      // Backend returns rows: { id, content, metadata, score }
      return results.map((row: any) => ({
        id: row.id.toString(),
        content: row.content,
        metadata: row.metadata,
        // We don't get tokens or full embedding back usually, but that's fine for RAG context
      }));

    } catch (error) {
      console.error('Error searching central store:', error);
      return [];
    }
  }
}

// Export as LocalVectorStore for compatibility if needed, or update usages.
// Since we are refactoring, we export the new class.
// But we might want to keep the name LocalVectorStore alias temporarily to avoid breaking everything immediately if we were doing incremental.
// But I will update usages.
export { CentralVectorStore as LocalVectorStore };
