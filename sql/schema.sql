-- KnitFlow Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  craft_type TEXT DEFAULT 'knitting' CHECK (craft_type IN ('knitting', 'crochet', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Patterns table
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'link')),
  storage_path TEXT,
  original_filename TEXT,
  link_url TEXT,
  page_count INTEGER,
  pattern_hash TEXT,
  last_page INTEGER DEFAULT 1,
  last_zoom NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_project_id ON patterns(project_id);
CREATE INDEX idx_patterns_user_id ON patterns(user_id);
CREATE INDEX idx_patterns_hash ON patterns(pattern_hash);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  bbox JSONB, -- {x, y, w, h} normalized 0..1
  color TEXT DEFAULT '#fef08a',
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_pattern_id ON notes(pattern_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Full text search for notes
ALTER TABLE notes ADD COLUMN text_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(text, ''))) STORED;
CREATE INDEX idx_notes_fts ON notes USING GIN(text_search);

-- Note photos table
CREATE TABLE note_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_photos_note_id ON note_photos(note_id);
CREATE INDEX idx_note_photos_project_id ON note_photos(project_id);

-- Counters table
CREATE TABLE counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT, -- NULL for main counter
  current_value INTEGER NOT NULL DEFAULT 0,
  target INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_counters_project_id ON counters(project_id);

-- Q&A Questions table
CREATE TABLE qna_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  pattern_hash TEXT,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  page_number INTEGER,
  bbox JSONB,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qna_questions_user_id ON qna_questions(user_id);
CREATE INDEX idx_qna_questions_project_id ON qna_questions(project_id);
CREATE INDEX idx_qna_questions_pattern_hash ON qna_questions(pattern_hash);
CREATE INDEX idx_qna_questions_visibility ON qna_questions(visibility);

-- Full text search for questions
ALTER TABLE qna_questions ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(body, '')), 'B')
  ) STORED;
CREATE INDEX idx_qna_questions_fts ON qna_questions USING GIN(search_vector);

-- Q&A Answers table
CREATE TABLE qna_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES qna_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qna_answers_question_id ON qna_answers(question_id);

-- Full text search for answers
ALTER TABLE qna_answers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(body, ''))) STORED;
CREATE INDEX idx_qna_answers_fts ON qna_answers USING GIN(search_vector);

-- Q&A Accepts table
CREATE TABLE qna_accepts (
  question_id UUID PRIMARY KEY REFERENCES qna_questions(id) ON DELETE CASCADE,
  accepted_answer_id UUID NOT NULL REFERENCES qna_answers(id) ON DELETE CASCADE,
  accepted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Packs table
CREATE TABLE support_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  pattern_hash TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  price_stripe_product_id TEXT,
  price_stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_packs_hash ON support_packs(pattern_hash);

-- Support Pack Items table
CREATE TABLE support_pack_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES support_packs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('faq', 'errata', 'video')),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  page_number INTEGER,
  bbox JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_pack_items_pack_id ON support_pack_items(pack_id);

-- Entitlements table
CREATE TABLE entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pro', 'support_pack')),
  ref_id UUID, -- pack_id for support_pack kind
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'manual')),
  stripe_subscription_id TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX idx_entitlements_kind ON entitlements(kind);
CREATE INDEX idx_entitlements_status ON entitlements(status);

-- Usage Counters table (for monthly quotas)
CREATE TABLE usage_counters (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  questions_asked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user has active pro entitlement
CREATE OR REPLACE FUNCTION public.is_pro_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = user_uuid
      AND kind = 'pro'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has pattern hash access (owns a project with that pattern)
CREATE OR REPLACE FUNCTION public.has_pattern_access(user_uuid UUID, p_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM patterns
    WHERE user_id = user_uuid AND pattern_hash = p_hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns support pack
CREATE OR REPLACE FUNCTION public.owns_support_pack(user_uuid UUID, pack_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = user_uuid
      AND kind = 'support_pack'
      AND ref_id = pack_uuid
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_counters_updated_at
  BEFORE UPDATE ON counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
