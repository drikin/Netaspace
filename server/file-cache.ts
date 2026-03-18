import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

// Ensure cache directory exists
try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {
  // ignore
}

interface CacheEntry<T> {
  data: T;
  cached: number;
}

function cacheFilePath(prefix: string, key: string | number): string {
  return path.join(CACHE_DIR, `${prefix}_${key}.json`);
}

export function getCache<T>(prefix: string, key: string | number, ttlMs: number): { data: T; cached: number } | null {
  const filePath = cacheFilePath(prefix, key);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.cached < ttlMs) {
      return { data: entry.data, cached: entry.cached };
    }
    // Expired — delete
    fs.unlinkSync(filePath);
    return null;
  } catch {
    return null;
  }
}

export function setCache<T>(prefix: string, key: string | number, data: T): number {
  const filePath = cacheFilePath(prefix, key);
  const now = Date.now();
  const entry: CacheEntry<T> = { data, cached: now };
  try {
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
  } catch (err) {
    console.error("Cache write error:", err);
  }
  return now;
}
