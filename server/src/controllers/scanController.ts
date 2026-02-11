import { Request, Response } from 'express';
import pool, { query } from '../config/db';
import { generateEmbeddings } from '../services/ollama';

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

export const indexDocuments = async (req: Request, res: Response) => {
  const { projectId, documents } = req.body;

  if (!projectId || !documents) {
    return res.status(400).json({ error: 'Missing projectId or documents' });
  }

  try {
    // 1. Clear existing documents for this project to avoid duplicates (optional, or update)
    // For simplicity, we delete and re-insert for now
    await query('DELETE FROM documents WHERE project_id = $1', [projectId]);

    let count = 0;

    for (const file of documents as ProcessedFile[]) {
      const chunks = splitText(file.content);

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        const embedding = await generateEmbeddings(chunk);
        if (embedding.length === 0) continue;

        // Convert embedding array to string for pgvector format: '[0.1, 0.2, ...]'
        const embeddingStr = `[${embedding.join(',')}]`;

        await query(
          'INSERT INTO documents (project_id, file_path, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)',
          [projectId, file.path, chunk, embeddingStr, JSON.stringify(file.metadata)]
        );
        count++;
      }
    }

    res.json({ message: `Successfully indexed ${count} chunks for project ${projectId}` });

  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({ error: 'Failed to index documents' });
  }
};

export const updateProjectDocs = async (req: Request, res: Response) => {
  const projectId = req.params.id || req.body.projectId;
  const { docParts, metadata, knowledgeGraph, stats, logs } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const existing = await query('SELECT id FROM projects WHERE id = $1', [projectId]);

    if (existing.rowCount === 0) {
       await query(
         'INSERT INTO projects (id, doc_parts, metadata, knowledge_graph, stats, logs) VALUES ($1, $2, $3, $4, $5, $6)',
         [projectId, JSON.stringify(docParts), JSON.stringify(metadata), JSON.stringify(knowledgeGraph), JSON.stringify(stats), JSON.stringify(logs)]
       );
    } else {
       await query(
         'UPDATE projects SET doc_parts = $2, metadata = $3, knowledge_graph = $4, stats = $5, logs = $6, updated_at = NOW() WHERE id = $1',
         [projectId, JSON.stringify(docParts), JSON.stringify(metadata), JSON.stringify(knowledgeGraph), JSON.stringify(stats), JSON.stringify(logs)]
       );
    }

    res.json({ message: 'Project documentation updated successfully' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project documentation' });
  }
};
