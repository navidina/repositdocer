-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects Table: Stores the overall documentation state
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  doc_parts JSONB,
  metadata JSONB,
  stats JSONB,
  logs JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Code Symbols Table: Replaces monolithic knowledge_graph JSONB
CREATE TABLE IF NOT EXISTS code_symbols (
  id SERIAL PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  symbol_id TEXT NOT NULL, -- e.g. "src/auth.ts:login"
  name TEXT NOT NULL,
  kind TEXT,
  file_path TEXT,
  line_number INTEGER,
  relationships JSONB, -- Stores { calledBy: [], calls: [] }
  created_at TIMESTAMP DEFAULT NOW()
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

-- Index for vector similarity search using HNSW (Faster, scalable)
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);

-- Index for faster symbol lookup
CREATE INDEX IF NOT EXISTS idx_code_symbols_project_id ON code_symbols(project_id);
CREATE INDEX IF NOT EXISTS idx_code_symbols_file_path ON code_symbols(file_path);
