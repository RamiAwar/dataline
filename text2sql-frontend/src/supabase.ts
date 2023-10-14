import { createClient, Session, User } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_PUBLIC_KEY || ""
);

export { supabase, type Session, type User };
