-- Resize ai_embeddings.embedding from vector(1536) to vector(768) for nomic-embed-text.
-- Drops existing ivfflat index (built for 1536 dims), truncates stale embeddings,
-- alters the column type, then rebuilds the index at the new dimension.

BEGIN;

-- Drop index first (required before ALTER COLUMN changes vector dimension)
DROP INDEX IF EXISTS ai_embeddings_embedding_idx;

-- Clear rows that were indexed with the old dimension to avoid silent type coercion
TRUNCATE TABLE ai_embeddings;

-- Alter column to new dimension
ALTER TABLE ai_embeddings ALTER COLUMN embedding TYPE vector(768)
    USING NULL;  -- existing rows are truncated above, so USING NULL is safe

-- Rebuild ivfflat index for cosine similarity search at 768 dims
CREATE INDEX ai_embeddings_embedding_idx
    ON ai_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMIT;
