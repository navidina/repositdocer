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
   * Sends files in batches to avoid payload limits and server timeouts.
   */
  async addDocuments(projectId: string, files: ProcessedFile[], onProgress?: (current: number, total: number) => void): Promise<void> {
    try {
      const BATCH_SIZE = 20; // Send 20 files at a time
      let processedCount = 0;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        // Ensure metadata is serializable and not too large if needed, though processedFile structure is usually fine.
        // We send the raw content here. The backend handles chunking and embedding.

        const response = await fetch(`${this.apiUrl}/vectors/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, documents: batch })
        });

        if (!response.ok) {
          throw new Error(`Failed to index batch ${i}: ${response.statusText}`);
        }

        processedCount += batch.length;
        if (onProgress) onProgress(processedCount, files.length);
      }

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

export { CentralVectorStore as LocalVectorStore };
