-- Row Level Security Policies for KnitFlow
-- Run this after schema.sql in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE qna_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qna_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qna_accepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Patterns policies
CREATE POLICY "Users can view own patterns"
  ON patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own patterns"
  ON patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON patterns FOR DELETE
  USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Note photos policies
CREATE POLICY "Users can view own note photos"
  ON note_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own note photos"
  ON note_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note photos"
  ON note_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Counters policies
CREATE POLICY "Users can view own counters"
  ON counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own counters"
  ON counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own counters"
  ON counters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own counters"
  ON counters FOR DELETE
  USING (auth.uid() = user_id);

-- Q&A Questions policies
-- Users can view own questions
CREATE POLICY "Users can view own questions"
  ON qna_questions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view shared questions if they have same pattern hash
CREATE POLICY "Users can view shared questions with same pattern"
  ON qna_questions FOR SELECT
  USING (
    visibility = 'shared'
    AND pattern_hash IS NOT NULL
    AND public.has_pattern_access(auth.uid(), pattern_hash)
  );

CREATE POLICY "Users can create own questions"
  ON qna_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
  ON qna_questions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions"
  ON qna_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Q&A Answers policies
-- Users can view answers to questions they can see
CREATE POLICY "Users can view answers to visible questions"
  ON qna_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qna_questions q
      WHERE q.id = question_id
      AND (
        q.user_id = auth.uid()
        OR (
          q.visibility = 'shared'
          AND q.pattern_hash IS NOT NULL
          AND public.has_pattern_access(auth.uid(), q.pattern_hash)
        )
      )
    )
  );

CREATE POLICY "Users can create answers to visible questions"
  ON qna_answers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM qna_questions q
      WHERE q.id = question_id
      AND (
        q.user_id = auth.uid()
        OR (
          q.visibility = 'shared'
          AND q.pattern_hash IS NOT NULL
          AND public.has_pattern_access(auth.uid(), q.pattern_hash)
        )
      )
    )
  );

CREATE POLICY "Users can update own answers"
  ON qna_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answers"
  ON qna_answers FOR DELETE
  USING (auth.uid() = user_id);

-- Q&A Accepts policies
CREATE POLICY "Question owners can manage accepts"
  ON qna_accepts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM qna_questions q
      WHERE q.id = question_id AND q.user_id = auth.uid()
    )
  );

-- Support Packs policies (readable by all authenticated)
CREATE POLICY "Anyone can view active support packs"
  ON support_packs FOR SELECT
  USING (active = true);

-- Support Pack Items policies
-- Can view if user owns the pack entitlement
CREATE POLICY "Users can view items for owned packs"
  ON support_pack_items FOR SELECT
  USING (
    public.owns_support_pack(auth.uid(), pack_id)
  );

-- Entitlements policies
CREATE POLICY "Users can view own entitlements"
  ON entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- Usage counters policies
CREATE POLICY "Users can view own usage counters"
  ON usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage counters"
  ON usage_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage counters"
  ON usage_counters FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass (for API routes)
-- Note: Service role automatically bypasses RLS, this is for documentation
