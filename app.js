const SUPABASE_URL = "https://coedqfdxzykoleerhwdb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZWRxZmR4enlrb2xlZXJod2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDEzMTUsImV4cCI6MjA4Nzc3NzMxNX0.OZBHVrgUFUvSaHInP-K34_FvGpqAuNvjPabmOk7SouQ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signup(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await sb.auth.signUp({ email, password });
  document.getElementById("msg").innerText = error ? error.message : "註冊成功";
}

async function login(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  document.getElementById("msg").innerText = error ? error.message : "登入成功";
}