// Import the Supabase library
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Your Supabase project URL
const SUPABASE_URL = "https://cmcexmuigttirtjpfaqa.supabase.co";

// Your Supabase publishable key
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OPA2JeHEgcbes2ef35iPag_y0_7pAxq";

// Create the Supabase client
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);