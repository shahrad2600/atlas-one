-- ─────────────────────────────────────────────────────────────
-- Atlas One — PostgreSQL Initialization
-- Runs once when the container is first created.
-- ─────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN index support for scalars
CREATE EXTENSION IF NOT EXISTS "citext";        -- case-insensitive text type

-- Verify extensions loaded
DO $$
BEGIN
  RAISE NOTICE 'Atlas One — PostgreSQL extensions initialized successfully';
  RAISE NOTICE '  uuid-ossp : %', (SELECT extversion FROM pg_extension WHERE extname = 'uuid-ossp');
  RAISE NOTICE '  vector    : %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
  RAISE NOTICE '  pg_trgm   : %', (SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm');
  RAISE NOTICE '  btree_gin : %', (SELECT extversion FROM pg_extension WHERE extname = 'btree_gin');
  RAISE NOTICE '  citext    : %', (SELECT extversion FROM pg_extension WHERE extname = 'citext');
END
$$;
