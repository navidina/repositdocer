import { Request, Response } from 'express';
import pool from '../config/db';
import { generateEmbeddings, generateCompletion } from '../services/ollama';

export const askQuestion = async (req: Request, res: Response) => {
  const { projectId, question, topK = 5 } = req.body;

  if (!projectId || !question) {
    return res.status(400).json({ error: 'Missing projectId or question.' });
  }

  try {
    // 1. Generate Query Embedding
    const embedding = await generateEmbeddings(question);
    if (!embedding || embedding.length === 0) {
      return res.status(500).json({ error: 'Failed to generate embedding for the question.' });
    }
    const embeddingStr = `[${embedding.join(',')}]`;

    // 2. Search in Vector DB (pgvector)
    const client = await pool.connect();

    // Use HNSW index (via <=> operator)
    const result = await client.query(
      `SELECT file_path, content, 1 - (embedding <=> $1) as score
       FROM documents
       WHERE project_id = $2
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [embeddingStr, projectId, topK]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.json({
        answer: "متأسفانه اطلاعاتی در این زمینه در مستندات پروژه یافت نشد.",
        sources: [],
        confidence_score: 0
      });
    }

    // 3. Construct Context
    let contextBlock = "";
    const sources: string[] = [];

    result.rows.forEach((row: any) => {
      // Clean content slightly if needed, but raw code is usually good
      contextBlock += `File: ${row.file_path}\nContent:\n${row.content}\n\n`;
      if (!sources.includes(row.file_path)) sources.push(row.file_path);
    });

    // 4. Prompt Engineering
    const prompt = `
    شما یک دستیار هوش مصنوعی ارشد (AI Senior Developer) هستید که به سوالات سایر برنامه‌ها و کارمندان پاسخ می‌دهید.
    بر اساس اطلاعات ارائه شده در بخش CONTEXT به سوال کاربر پاسخ دهید.
    اگر جواب در CONTEXT نیست، صادقانه بگویید که در مستندات فعلی اطلاعاتی وجود ندارد و از خودتان چیزی نسازید.
    پاسخ را کوتاه، فنی و دقیق بدهید.

    CONTEXT:
    ${contextBlock}

    USER QUESTION:
    ${question}

    ANSWER:
    `;

    // 5. Generate Answer
    const answer = await generateCompletion(prompt);

    // 6. Respond
    res.json({
      answer: answer.trim(),
      sources: sources,
      confidence_score: result.rows[0]?.score || 0
    });

  } catch (error) {
    console.error('Integration API Error:', error);
    res.status(500).json({ error: 'Internal Server Error processing RAG request.' });
  }
};
