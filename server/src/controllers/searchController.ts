import { Request, Response } from 'express';
import { query } from '../config/db';
import { generateEmbeddings } from '../services/ollama';

export const searchDocuments = async (req: Request, res: Response) => {
  const { projectId, query: searchQuery, topK } = req.body;

  if (!projectId || !searchQuery) {
    return res.status(400).json({ error: 'Missing projectId or query' });
  }

  const k = topK || 5;

  try {
    const embedding = await generateEmbeddings(searchQuery);
    if (!embedding || embedding.length === 0) {
      return res.status(400).json({ error: 'Failed to generate embedding for query' });
    }

    const embeddingStr = `[${embedding.join(',')}]`;

    // Perform cosine similarity search using pgvector
    const result = await query(
      `SELECT id, content, metadata, 1 - (embedding <=> $1) as score
       FROM documents
       WHERE project_id = $2
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [embeddingStr, projectId, k]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};
