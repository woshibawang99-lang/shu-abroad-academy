/* ShuAbroadAcademy Supabase browser client configuration. */
const SUPABASE_URL = 'https://fmfumqjvzhrosiipmins.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_MUgMWXq7ww-kSyoU8Wa25Q_46-HIppI';

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
