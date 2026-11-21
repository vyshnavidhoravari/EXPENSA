
const SUPABASE_URL = "https://mtfaoyikfzmkweghkmth.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_HMxZC6H7hMaJ8v8eS9wcGw_QM3UKx5x";

if (!window.supabase) {
  throw new Error("Supabase library failed to load.");
}

window.expensaSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log("EXPENSA Supabase connected successfully!");
