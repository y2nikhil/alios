export type SoundKey = "chime" | "ping" | "pop" | "celebrate" | "none";

const SOUND_FILES: Record<Exclude<SoundKey, "none">, string> = {
  chime: "/sounds/chime.wav",
  ping: "/sounds/ping.wav",
  pop: "/sounds/pop.wav",
  celebrate: "/sounds/celebrate.wav",
};

export const SOUND_OPTIONS: { key: SoundKey; label: string }[] = [
  { key: "chime", label: "Chime (default)" },
  { key: "ping", label: "Ping (short)" },
  { key: "pop", label: "Pop (soft)" },
  { key: "celebrate", label: "Celebrate (longer)" },
  { key: "none", label: "Silent" },
];

const LOCAL_KEY = "alios.notif.sound";
export function getStoredSound(): SoundKey {
  if (typeof window === "undefined") return "chime";
  const v = localStorage.getItem(LOCAL_KEY) as SoundKey | null;
  return v ?? "chime";
}
export function setStoredSound(s: SoundKey) {
  try { localStorage.setItem(LOCAL_KEY, s); } catch {}
}

let audioCache: Partial<Record<SoundKey, HTMLAudioElement>> = {};
export function playNotificationSound(sound?: SoundKey) {
  if (typeof window === "undefined") return;
  const key = sound ?? getStoredSound();
  if (key === "none") return;
  const src = SOUND_FILES[key as Exclude<SoundKey, "none">];
  if (!src) return;
  let a = audioCache[key];
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    a.volume = 0.6;
    audioCache[key] = a;
  }
  try {
    a.currentTime = 0;
    void a.play().catch(() => { /* user gesture not yet made */ });
  } catch { /* ignore */ }
}

/** Pick a sound appropriate for a notification category, falling back to user default. */
export function soundForCategory(type: string): SoundKey {
  const user = getStoredSound();
  if (user === "none") return "none";
  // Category overrides only kick in when the user hasn't opted for silence.
  // Return user's chosen sound to keep experience consistent unless celebratory.
  if (type === "task_completed" || type === "focus_milestone") return user === "chime" ? "celebrate" : user;
  return user;
}
