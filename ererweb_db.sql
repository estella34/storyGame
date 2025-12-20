-- --------------------------------------------------------
-- 1. BÖLÜM: SEQUENCES (SAYAÇLAR)
-- Tablolar oluşturulurken ID ataması için bunlar gereklidir.
-- --------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq INCREMENT 1 START 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.games_id_seq INCREMENT 1 START 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.chapters_id_seq INCREMENT 1 START 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.scenes_id_seq INCREMENT 1 START 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.choices_id_seq INCREMENT 1 START 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.player_progress_id_seq INCREMENT 1 START 1 CACHE 1;

-- --------------------------------------------------------
-- 2. BÖLÜM: ANA TABLOLAR (Bağımsızlar)
-- Bu tabloların Foreign Key (FK) bağımlılığı yoktur.
-- --------------------------------------------------------

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying(30) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user',
    avatar_url character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_username_key UNIQUE (username),
    CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY['admin', 'user']::text[]))
);

-- GAMES TABLE
CREATE TABLE IF NOT EXISTS public.games
(
    id integer NOT NULL DEFAULT nextval('games_id_seq'::regclass),
    title character varying(100) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    cover_image character varying(255),
    is_published boolean DEFAULT false,
    stat_definitions jsonb DEFAULT '[]'::jsonb,
    game_config jsonb DEFAULT '{}'::jsonb,
    initial_stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    design_theme character varying(50) DEFAULT 'ANCIENT',
    intro_video_url text,
    default_char_name character varying(100) DEFAULT 'Gezgin',
    default_char_image text,
    allow_custom_character boolean DEFAULT true,
    CONSTRAINT games_pkey PRIMARY KEY (id),
    CONSTRAINT games_slug_key UNIQUE (slug)
);

-- --------------------------------------------------------
-- 3. BÖLÜM: BAĞIMLI TABLOLAR (Level 1)
-- Bu tablolar Users veya Games tablolarına ihtiyaç duyar.
-- --------------------------------------------------------

-- CHAPTERS TABLE (Games'e bağlı)
CREATE TABLE IF NOT EXISTS public.chapters
(
    id integer NOT NULL DEFAULT nextval('chapters_id_seq'::regclass),
    game_id integer,
    title character varying(255) NOT NULL,
    sort_order integer DEFAULT 0,
    CONSTRAINT chapters_pkey PRIMARY KEY (id),
    CONSTRAINT chapters_game_id_fkey FOREIGN KEY (game_id)
        REFERENCES public.games (id) ON DELETE CASCADE
);

-- PLAYER_PROGRESS TABLE (Users ve Games'e bağlı)
CREATE TABLE IF NOT EXISTS public.player_progress
(
    id integer NOT NULL DEFAULT nextval('player_progress_id_seq'::regclass),
    user_id integer,
    game_id integer,
    current_scene_id integer,
    current_stats jsonb DEFAULT '{}'::jsonb,
    history_log jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    character_name character varying(100),
    character_image text,
    CONSTRAINT player_progress_pkey PRIMARY KEY (id),
    CONSTRAINT player_progress_user_id_game_id_key UNIQUE (user_id, game_id),
    CONSTRAINT player_progress_game_id_fkey FOREIGN KEY (game_id)
        REFERENCES public.games (id) ON DELETE CASCADE,
    CONSTRAINT player_progress_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- 4. BÖLÜM: DETAY TABLOLAR (Level 2 & 3)
-- Bu tablolar Chapters veya Scenes tablolarına ihtiyaç duyar.
-- --------------------------------------------------------

-- SCENES TABLE (Chapters ve Games'e bağlı)
CREATE TABLE IF NOT EXISTS public.scenes
(
    id integer NOT NULL DEFAULT nextval('scenes_id_seq'::regclass),
    game_id integer,
    chapter_id integer,
    title character varying(255),
    content jsonb DEFAULT '[]'::jsonb,
    media_url text,
    media_type character varying(50),
    choice_timeout integer DEFAULT 0,
    is_starting_scene boolean DEFAULT false,
    is_end_scene boolean DEFAULT false,
    is_final boolean DEFAULT false,
    CONSTRAINT scenes_pkey PRIMARY KEY (id),
    CONSTRAINT scenes_chapter_id_fkey FOREIGN KEY (chapter_id)
        REFERENCES public.chapters (id) ON DELETE CASCADE,
    CONSTRAINT scenes_game_id_fkey FOREIGN KEY (game_id)
        REFERENCES public.games (id) ON DELETE CASCADE
);

-- CHOICES TABLE (Scenes'e bağlı)
CREATE TABLE IF NOT EXISTS public.choices
(
    id integer NOT NULL DEFAULT nextval('choices_id_seq'::regclass),
    scene_id integer,
    text character varying(255) NOT NULL,
    target_scene_id integer,
    requirements jsonb DEFAULT '[]'::jsonb,
    effects jsonb DEFAULT '[]'::jsonb,
    dynamic_routes jsonb DEFAULT '[]'::jsonb,
    result_content jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT choices_pkey PRIMARY KEY (id),
    CONSTRAINT choices_scene_id_fkey FOREIGN KEY (scene_id)
        REFERENCES public.scenes (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- 5. BÖLÜM: SEQUENCE SAHİPLİKLERİ VE İNDEKSLER
-- Temizlik yaparken tablolara bağlı sequence'ların da silinmesini sağlar.
-- --------------------------------------------------------

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;
ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;
ALTER SEQUENCE public.scenes_id_seq OWNED BY public.scenes.id;
ALTER SEQUENCE public.choices_id_seq OWNED BY public.choices.id;
ALTER SEQUENCE public.player_progress_id_seq OWNED BY public.player_progress.id;

-- İndeksler (Performans için)
CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users USING btree (email ASC NULLS LAST)
    WITH (fillfactor=100);

CREATE INDEX IF NOT EXISTS idx_users_username
    ON public.users USING btree (username ASC NULLS LAST)
    WITH (fillfactor=100);