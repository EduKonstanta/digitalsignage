"use client";

export type SpeechGender = "AUTO" | "MALE" | "FEMALE";

export interface SpeechOptions {
  gender?: SpeechGender;
  language?: string;
  preferredVoiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  chime?: boolean;
}

/**
 * Cocokkan per kata utuh. Pencocokan substring membuat "male" ikut mengenai
 * "Female" dan "man" mengenai "Woman", sehingga suara wanita terpilih untuk
 * siswa pria.
 */
const VOICE_HINTS = {
  MALE: /\b(ardi|dimas|andika|male|man|pria|laki-laki)\b/i,
  FEMALE: /\b(gadis|damayanti|siti|female|woman|wanita|perempuan)\b/i,
} as const;

/**
 * Nada suara per gender. Kalau perangkat tidak punya suara Indonesia berbeda
 * untuk pria dan wanita (umum di Android TV: hanya satu suara), nada digeser
 * lebih jauh supaya siswa pria dan wanita tetap terdengar berbeda.
 */
const GENDER_PITCH = {
  MATCHED: { MALE: 0.95, FEMALE: 1.08 },
  FALLBACK: { MALE: 0.7, FEMALE: 1.25 },
} as const;

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (sharedAudioContext) return sharedAudioContext;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedAudioContext = AudioCtx ? new AudioCtx() : null;
  return sharedAudioContext;
}

async function loadVoices(timeoutMs = 1_500) {
  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length) return immediate;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}

export function selectVoice(voices: SpeechSynthesisVoice[], options: SpeechOptions) {
  const language = (options.language || "id-ID").toLowerCase();
  const languagePrefix = language.split("-")[0];
  const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
  // Sebagian browser TV hanya memasang voice bahasa Inggris. Memilih voice
  // sistem tersebut tetap lebih baik daripada membiarkan announcement diam.
  const candidates = matching.length ? matching : voices;

  if (options.preferredVoiceName) {
    const preferred = candidates.find((voice) =>
      voice.name.toLowerCase().includes(options.preferredVoiceName!.toLowerCase()),
    );
    if (preferred) return { voice: preferred, genderMatched: true };
  }

  const gender = options.gender || "AUTO";
  if (gender !== "AUTO") {
    const genderVoice = candidates.find((voice) => VOICE_HINTS[gender].test(voice.name));
    if (genderVoice) return { voice: genderVoice, genderMatched: true };
  }

  return {
    voice:
      candidates.find((voice) => /natural|google|indonesian/i.test(voice.name)) || candidates[0],
    genderMatched: false,
  };
}

/** Nada bawaan; hanya berlaku bila pemanggil tidak menentukan `pitch` sendiri. */
export function resolvePitch(gender: SpeechGender, genderMatched: boolean) {
  if (gender === "AUTO") return 1.05;
  return GENDER_PITCH[genderMatched ? "MATCHED" : "FALLBACK"][gender];
}

export async function unlockSignageAudio() {
  if (typeof window === "undefined") return false;
  const context = getAudioContext();
  if (context?.state === "suspended") await context.resume();
  window.speechSynthesis?.resume();
  const enabled = !context || context.state === "running";
  if (enabled) window.dispatchEvent(new CustomEvent("signage-audio-enabled"));
  return enabled;
}

/**
 * Modern 2-tone crisp cyber chime sound (C5 -> G5)
 */
export async function playModernChime(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    await new Promise<void>((resolve) => {
      // Crisp 2-tone cyber chime (C5 -> G5)
      const frequencies = [523.25, 783.99];
      const noteDuration = 0.25;
      const startTime = ctx.currentTime + 0.02;

      frequencies.forEach((freq, idx) => {
        const noteStart = startTime + idx * 0.16;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });

      setTimeout(() => {
        resolve();
      }, (frequencies.length * 0.16 + noteDuration + 0.05) * 1000);
    });
  } catch {
    return;
  }
}

/**
 * Pauses all playing HTML5 media elements on the DOM during announcement.
 */
export function pauseAllMedia() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("announcement-start"));

  const mediaElements = document.querySelectorAll<HTMLMediaElement>("video, audio");
  mediaElements.forEach((el) => {
    try {
      if (!el.paused) {
        el.pause();
        el.dataset.wasPausedByAnnouncement = "true";
      }
    } catch {
      // Ignore
    }
  });
}

/**
 * Resumes media elements after announcement completes.
 */
export function resumeAllMedia() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("announcement-end"));

  const mediaElements = document.querySelectorAll<HTMLMediaElement>("video, audio");
  mediaElements.forEach((el) => {
    try {
      if (el.dataset.wasPausedByAnnouncement === "true") {
        delete el.dataset.wasPausedByAnnouncement;
        void el.play().catch(() => undefined);
      }
    } catch {
      // Ignore
    }
  });
}

/**
 * Speaks text with a modern, energetic, natural Gen-Z cadence.
 * Rate: 1.0 (natural normal speed)
 * Pitch: 1.05 (fresh, energetic tone)
 */
export async function speakGenZSpeech(text: string, options: SpeechOptions = {}): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // cancel() hanya membersihkan sisa antrean milik browser sebelum ucapan ini
  // mulai. Urutan antar-pengumuman diatur oleh antrean di bawah, bukan di sini,
  // supaya sapaan presensi tidak lagi memotong pengumuman yang sedang berbunyi.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.language || "id-ID";
  utterance.rate = options.rate ?? 1;
  utterance.volume = options.volume ?? 1;

  const { voice, genderMatched } = selectVoice(await loadVoices(), options);
  if (voice) {
    utterance.voice = voice;
    // Selaraskan bahasa dengan voice yang betul-betul tersedia di TV. Ini
    // mencegah beberapa WebView menolak utterance id-ID saat hanya ada en-US.
    utterance.lang = voice.lang || utterance.lang;
  }
  utterance.pitch = options.pitch ?? resolvePitch(options.gender || "AUTO", genderMatched);

  await new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve();
    };

    const estimatedDuration = Math.min(Math.max(text.length * 85, 5_000), 30_000);
    const timeout = window.setTimeout(finish, estimatedDuration);

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Complete Pre-Class Announcement Flow:
 * 1. Pause media
 * 2. Play modern cyber chime
 * 3. Speak Gen-Z announcement
 * 4. Resume media
 */
/** Sapaan presensi didahulukan; pengumuman lain tetap dijalankan setelahnya. */
export type AnnouncementPriority = "attendance" | "normal";

interface QueueItem {
  text: string;
  options: SpeechOptions;
  priority: AnnouncementPriority;
  resolve: () => void;
}

const announcementQueue: QueueItem[] = [];
let queueRunning = false;

async function runAnnouncement(item: QueueItem) {
  pauseAllMedia();
  try {
    if (item.options.chime !== false) await playModernChime();
    await speakGenZSpeech(item.text, item.options);
  } finally {
    setTimeout(() => {
      resumeAllMedia();
    }, 500);
  }
}

async function drainAnnouncementQueue() {
  if (queueRunning) return;
  queueRunning = true;
  try {
    while (announcementQueue.length) {
      const item = announcementQueue.shift() as QueueItem;
      try {
        await runAnnouncement(item);
      } finally {
        item.resolve();
      }
      // Jeda pendek supaya dua pengumuman berurutan tidak terdengar menempel.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    queueRunning = false;
  }
}

/**
 * Complete Pre-Class Announcement Flow (chime, ucapan, pause/resume media).
 *
 * Semua pemanggil masuk satu antrean: tap kartu siswa disisipkan di depan
 * pengumuman biasa yang masih menunggu, tetapi tidak memotong ucapan yang
 * sedang berjalan — sebelumnya keduanya sama-sama memanggil
 * speechSynthesis.cancel() sehingga saling memutus.
 */
export function triggerGenZAnnouncement(
  text: string,
  options: SpeechOptions = {},
  priority: AnnouncementPriority = "normal",
): Promise<void> {
  return new Promise<void>((resolve) => {
    const item: QueueItem = { text, options, priority, resolve };

    if (priority === "attendance") {
      const firstNormal = announcementQueue.findIndex((queued) => queued.priority === "normal");
      if (firstNormal === -1) announcementQueue.push(item);
      else announcementQueue.splice(firstNormal, 0, item);
    } else {
      announcementQueue.push(item);
    }

    void drainAnnouncementQueue();
  });
}
