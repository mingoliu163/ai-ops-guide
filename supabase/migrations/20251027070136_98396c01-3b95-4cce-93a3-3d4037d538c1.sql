-- 创建用户配置表存储飞书用户信息
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  feishu_open_id TEXT UNIQUE,
  feishu_union_id TEXT,
  name TEXT,
  avatar_url TEXT,
  mobile TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建巡检记录表
CREATE TABLE IF NOT EXISTS public.inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_addresses TEXT[] NOT NULL,
  query_info JSONB,
  ai_result JSONB,
  score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_records ENABLE ROW LEVEL SECURITY;

-- Profiles表策略：所有人可以查看，只能更新自己的
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = (SELECT id FROM public.profiles WHERE feishu_open_id = current_setting('request.jwt.claims', true)::json->>'feishu_open_id'));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- 巡检记录策略：用户可以查看和创建自己的记录
CREATE POLICY "Users can view own inspection records"
  ON public.inspection_records FOR SELECT
  USING (user_id = (SELECT id FROM public.profiles WHERE feishu_open_id = current_setting('request.jwt.claims', true)::json->>'feishu_open_id'));

CREATE POLICY "Users can insert own inspection records"
  ON public.inspection_records FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE feishu_open_id = current_setting('request.jwt.claims', true)::json->>'feishu_open_id'));

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为profiles表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();