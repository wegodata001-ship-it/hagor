const getEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : fallback;
};

export const STORAGE_BUCKET = getEnv("SUPABASE_STORAGE_BUCKET", "store-assets");
