-- Community Hero — geospatial + semantic scale-up (run in Supabase → SQL Editor)
-- Replaces JS haversine scans with PostGIS spatial indexes, and in-memory
-- cosine similarity with pgvector HNSW — dedup stays fast at millions of rows.

-- ─────────────────────────── extensions ─────────────────────────
create extension if not exists postgis;
create extension if not exists vector;

-- ─────────────────────────── geometry ───────────────────────────
-- Generated geography column stays in sync with lat/lng automatically.
alter table public.issues
  add column if not exists location_geom geography(point, 4326)
  generated always as (
    case when lat is not null and lng is not null
      then ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    end
  ) stored;

-- GiST spatial index → fast radius + bounding-box queries for the map & dedup.
create index if not exists issues_location_gist on public.issues using gist (location_geom);

-- ─────────────────────────── embeddings ─────────────────────────
-- Gemini gemini-embedding-001 reduced to 768 dims (HNSW supports ≤ 2000).
alter table public.issues
  add column if not exists embedding vector(768);

create index if not exists issues_embedding_hnsw on public.issues
  using hnsw (embedding vector_cosine_ops);

-- ───────────────────────────── RPCs ─────────────────────────────
-- Geo dedup: open same-category issues within radius_m, nearest first.
create or replace function public.nearby_issues(
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 450,
  p_exclude uuid default null
)
returns table (issue_id uuid, distance_m double precision)
language sql stable as $$
  select i.id, ST_Distance(i.location_geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  from public.issues i
  where i.category = p_category
    and i.status <> 'Resolved'
    and i.location_geom is not null
    and (p_exclude is null or i.id <> p_exclude)
    and ST_DWithin(i.location_geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by 2 asc
  limit 50;
$$;

-- Semantic dedup: cosine-nearest open issues to a query embedding (HNSW).
create or replace function public.match_issues(
  p_embedding vector(768),
  p_threshold double precision default 0.88,
  p_limit int default 8,
  p_exclude uuid default null
)
returns table (issue_id uuid, similarity double precision)
language sql stable as $$
  select i.id, 1 - (i.embedding <=> p_embedding)
  from public.issues i
  where i.embedding is not null
    and i.status <> 'Resolved'
    and (p_exclude is null or i.id <> p_exclude)
    and 1 - (i.embedding <=> p_embedding) >= p_threshold
  order by i.embedding <=> p_embedding
  limit p_limit;
$$;
