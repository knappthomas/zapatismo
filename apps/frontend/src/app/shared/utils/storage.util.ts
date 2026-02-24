export const storage = {
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  set(key: string, value: unknown): void {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};
