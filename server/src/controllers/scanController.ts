import { Request, Response } from 'express';
import pool from '../config/db';
import { generateEmbeddings } from '../services/ollama';
import { Semaphore } from '../utils/semaphore';

interface ProcessedFile {
  path: string;
  content: string;
  metadata: any;
}

const splitText = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
};

// Limit concurrent embedding requests to Ollama to avoid timeouts
const embeddingSemaphore = new Semaphore(5);

export const indexDocuments = async (req: Request, res: Response) => {
  const { projectId, documents } = req.body;

  if (!projectId || !documents) {
    return res.status(400).json({ error: 'Missing projectId or documents' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clear existing documents for this project
    // Note: If sending batches, we might be appending, not replacing.
    // However, if we assume a fresh scan, we should clear first.
    // But since the frontend sends batches, the first batch should clear, subsequent ones should append?
    // Or we should expose a 'reset' endpoint.
    // For simplicity, let's assume 'documents' array is partial and we are appending.
    // The frontend should call a 'clear' endpoint before starting a scan.
    // BUT: The prompt says "Refactor Frontend (`hooks/useRepoProcessor.ts`) Batching".
    // If the frontend iterates and calls this endpoint multiple times, we cannot delete here every time.
    // We should probably check if this is the first batch or just always append.
    // Let's assume append mode for now. The user can implement a clear button separately or we can add a 'clear' flag.
    // Given the constraints, I will add a check: if documents.length > 0, we insert. Deletion should be explicit.
    // However, the previous code deleted everything.
    // To support batching properly without explicit 'init' signal, we might need a separate endpoint to clear.
    // Let's modify this to ONLY insert. The frontend should call a clear endpoint first if it wants to re-scan.
    // Or we can query if project has docs.

    // Updated Logic: We do NOT delete here. We assume the caller manages lifecycle or we add a query param ?clear=true.
    const clear = req.query.clear === 'true';
    if (clear) {
        await client.query('DELETE FROM documents WHERE project_id = $1', [projectId]);
    }

    let count = 0;
    const fileProcessingPromises = (documents as ProcessedFile[]).map(async (file) => {
      const chunks = splitText(file.content);

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        await embeddingSemaphore.acquire();
        let embedding: number[] = [];
        try {
            embedding = await generateEmbeddings(chunk);
        } finally {
            embeddingSemaphore.release();
        }

        if (embedding.length === 0) continue;

        const embeddingStr = `[${embedding.join(',')}]`;

        await client.query(
          'INSERT INTO documents (project_id, file_path, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)',
          [projectId, file.path, chunk, embeddingStr, JSON.stringify(file.metadata)]
        );
        count++;
      }
    });

    await Promise.all(fileProcessingPromises);

    await client.query('COMMIT');
    res.json({ message: `Successfully indexed ${count} chunks for project ${projectId}` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Indexing error:', error);
    res.status(500).json({ error: 'Failed to index documents' });
  } finally {
    client.release();
  }
};

export const updateProjectDocs = async (req: Request, res: Response) => {
  const projectId = req.params.id || req.body.projectId;
  const { docParts, metadata, knowledgeGraph, stats, logs } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update project metadata
    const existing = await client.query('SELECT id FROM projects WHERE id = $1', [projectId]);

    // We are now storing knowledgeGraph in a separate table, so we pass null or empty object here if we migrated fully.

    // 1. Upsert Project
    if (existing.rowCount === 0) {
       await client.query(
         'INSERT INTO projects (id, doc_parts, metadata, stats, logs) VALUES ($1, $2, $3, $4, $5)',
         [projectId, JSON.stringify(docParts), JSON.stringify(metadata), JSON.stringify(stats), JSON.stringify(logs)]
       );
    } else {
       await client.query(
         'UPDATE projects SET doc_parts = $2, metadata = $3, stats = $4, logs = $5, updated_at = NOW() WHERE id = $1',
         [projectId, JSON.stringify(docParts), JSON.stringify(metadata), JSON.stringify(stats), JSON.stringify(logs)]
       );
    }

    // 2. Update Code Symbols (Knowledge Graph)
    if (knowledgeGraph) {
        // Clear existing symbols for project
        await client.query('DELETE FROM code_symbols WHERE project_id = $1', [projectId]);

        const symbols = Object.values(knowledgeGraph);
        for (const sym of symbols as any[]) {
            await client.query(
                `INSERT INTO code_symbols (project_id, symbol_id, name, kind, file_path, line_number, relationships)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    projectId,
                    sym.id,
                    sym.name,
                    sym.kind,
                    sym.filePath,
                    sym.line || 0,
                    JSON.stringify(sym.relationships || {})
                ]
            );
        }
    }

    await client.query('COMMIT');
    res.json({ message: 'Project documentation and knowledge graph updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project documentation' });
  } finally {
    client.release();
  }
};
