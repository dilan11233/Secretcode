export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return isRealSupabaseValue(url) && isRealSupabaseValue(anonKey);
}

export function isRealSupabaseValue(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return !lower.includes("buraya") && !lower.includes("your_") && !lower.includes("example");
}

export const SUPABASE_SETUP_MESSAGE =
  "Supabase ayarları eksik. Proje klasöründe .env.local dosyası oluştur (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY), sonra terminalde Ctrl+C ile durdurup npm run dev komutunu yeniden çalıştır.";
