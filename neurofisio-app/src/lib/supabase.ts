import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://taeydljxtzrllkwodarl.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZXlkbGp4dHpybGxrd29kYXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjczNTMsImV4cCI6MjA4NDUwMzM1M30.YdxG-dlmd5Z92_PZ62cMaQ0MxjdpJJB8S8EvO9wbcGM";

export const supabase = createClient(supabaseUrl, supabaseKey);
