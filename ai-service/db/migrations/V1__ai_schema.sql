-- Draft migration: AI tables for RAG, embeddings, models, conversations
-- Apply manually (psql) or integrate into Flyway per project policy.

CREATE TABLE IF NOT EXISTS ai_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_type VARCHAR(64),      -- DEVIS | FACTURE | COMMANDE | SAV | DOC
    source_id UUID,               -- original entity id when applicable
    title VARCHAR(512),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_documents_tenant_isolation ON ai_documents
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_ai_documents_tenant_created ON ai_documents(tenant_id, created_at DESC);

-- Embeddings table using pgvector
CREATE TABLE IF NOT EXISTS ai_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    embedding vector(1536),
    model_name VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_embeddings_tenant_isolation ON ai_embeddings
    USING (tenant_id = current_tenant_id());
CREATE INDEX idx_ai_embeddings_document ON ai_embeddings(document_id);
-- ANN index (pgvector) — adjust using ivfflat if dataset grows
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_vector ON ai_embeddings USING ivfflat (embedding) WITH (lists = 100);

-- Models metadata
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32),
    artifact_path TEXT,   -- path or storage reference
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_models_tenant_isolation ON ai_models
    USING (tenant_id = current_tenant_id());

-- Conversations / chat history
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    messages JSONB NOT NULL, -- array of {role, text, ts}
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_conversations_tenant_isolation ON ai_conversations
    USING (tenant_id = current_tenant_id());
