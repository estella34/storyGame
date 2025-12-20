-- is_final kolonunu scenes tablosuna ekle
ALTER TABLE public.scenes 
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;


