-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects Table: Stores the overall documentation state
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  doc_parts JSONB,
  metadata JSONB,
  knowledge_graph JSONB,
  stats JSONB,
  logs JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents Table: Stores code chunks and their embeddings
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Assumes default Nomic embedding size (768). Adjust if using different model.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
