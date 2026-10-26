-- ensure ai_embeddings
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
DROP POLICY IF EXISTS ai_embeddings_tenant_isolation ON ai_embeddings;
CREATE POLICY ai_embeddings_tenant_isolation ON ai_embeddings
    USING (tenant_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_vector ON ai_embeddings USING ivfflat (embedding) WITH (lists = 100);

-- ensure ai_models
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32),
    artifact_path TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_models_tenant_isolation ON ai_models;
CREATE POLICY ai_models_tenant_isolation ON ai_models
    USING (tenant_id = current_tenant_id());

-- ensure ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    messages JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_conversations_tenant_isolation ON ai_conversations;
CREATE POLICY ai_conversations_tenant_isolation ON ai_conversations
    USING (tenant_id = current_tenant_id());
