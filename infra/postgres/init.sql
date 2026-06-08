-- Run once on first DB init
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector

-- Separate schema for Keycloak to avoid table collisions
CREATE SCHEMA IF NOT EXISTS keycloak;
