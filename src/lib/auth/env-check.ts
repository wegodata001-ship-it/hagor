/** Validates auth-related server env before login / session signing. */
export function getAuthEnvError(): string | null {
  const session = process.env.SESSION_SECRET?.trim();
  if (!session || session.length < 16) {
    return "SESSION_SECRET חסר או קצר מדי בשרת. הוסיפו אותו בהגדרות האחסון (לפחות 16 תווים).";
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return "DATABASE_URL חסר בשרת. חברו את מסד הנתונים (Supabase) בהגדרות האחסון.";
  }
  return null;
}

export function prismaErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("P1001") || msg.includes("Can't reach database")) {
    return "לא ניתן להתחבר למסד הנתונים. בדקו את DATABASE_URL בהגדרות האחסון.";
  }
  if (msg.includes("P1017") || msg.includes("Server has closed the connection")) {
    return "חיבור מסד הנתונים נותק. ודאו ש-DATABASE_URL משתמש ב-Supabase Pooler (פורט 6543 / pgbouncer).";
  }
  if (msg.includes("Authentication failed") || msg.includes("password authentication")) {
    return "פרטי התחברות למסד הנתונים שגויים. בדקו סיסמה ו-URL ב-DATABASE_URL.";
  }
  return "שגיאת שרת. נסו שוב מאוחר יותר.";
}
