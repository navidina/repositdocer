import { Request, Response } from 'express';
import pool from '../config/db';

export const getProjectDocs = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const client = await pool.connect();

    // 1. Fetch Project Metadata
    const projectRes = await client.query(
      'SELECT id, name, doc_parts, metadata, stats, logs FROM projects WHERE id = $1',
      [id]
    );

    if (projectRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRes.rows[0];

    // 2. Fetch Knowledge Graph (Code Symbols)
    const symbolsRes = await client.query(
      'SELECT symbol_id, name, kind, file_path, line_number, relationships FROM code_symbols WHERE project_id = $1',
      [id]
    );

    // Reconstruct Knowledge Graph Object
    // Frontend expects: Record<string, CodeSymbol>
    const knowledgeGraph: Record<string, any> = {};
    symbolsRes.rows.forEach(row => {
        knowledgeGraph[row.symbol_id] = {
            id: row.symbol_id,
            name: row.name,
            kind: row.kind,
            filePath: row.file_path,
            line: row.line_number,
            relationships: row.relationships
        };
    });

    client.release();

    // 3. Assemble Response
    // We attach knowledgeGraph to the response object to match frontend expectations
    // Note: The frontend expects snake_case from DB if directly fetching rows, but we are constructing a JSON response.
    // Let's ensure keys match what useRepoProcessor expects.
    // The previous implementation returned raw rows.
    // The frontend maps:
    // if (data.doc_parts) setDocParts(data.doc_parts);
    // if (data.knowledge_graph) setKnowledgeGraph(data.knowledge_graph);

    // So we should return snake_case keys for the root object if that's what we did before, or update frontend.
    // Let's stick to returning a clean object.

    const responseData = {
        ...project,
        knowledge_graph: knowledgeGraph // Inject the reconstructed graph
    };

    res.json(responseData);

  } catch (error) {
    console.error('Fetch project docs error:', error);
    res.status(500).json({ error: 'Failed to fetch project docs' });
  }
};
