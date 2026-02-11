import { Request, Response } from 'express';
import { query } from '../config/db';

export const getProjectDocs = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const result = await query(
      'SELECT id, name, doc_parts, metadata, knowledge_graph, stats, logs FROM projects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch project docs error:', error);
    res.status(500).json({ error: 'Failed to fetch project docs' });
  }
};
