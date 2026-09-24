import { DisplayTicker } from "@/lib/display-data";
import { AlertCircle, Megaphone } from "lucide-react";

interface SignageTickerProps {
  messages: DisplayTicker[];
  now: Date | null;
}

const QUOTES = [
  "Pendidikan adalah tiket menuju masa depan.",
  "Belajar hari ini, memimpin esok hari.",
  "Konsistensi kecil menghasilkan pencapaian besar.",
  "Rasa ingin tahu adalah awal dari setiap penemuan.",
  "Setiap latihan membawa kita selangkah lebih dekat pada tujuan.",
];

export function SignageTicker({ messages, now }: SignageTickerProps) {
  const quote = QUOTES[(now?.getDate() ?? 0) % QUOTES.length];
  const items =
    messages.length > 0
      ? messages
      : [
          {
            id: "welcome",
            text: "Selamat datang di Konstanta Education. Harap hadir 10 menit sebelum kelas dimulai.",
            priority: 1,
            speed: 25,
          },
          {
            id: "quote",
            text: `Quote hari ini: ${quote}`,
            priority: 1,
            speed: 25,
          },
        ];

  const group = (suffix: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={suffix === "copy"}>
      {items.map((message) => (
        <div key={`${message.id}-${suffix}`} className="mx-10 inline-flex items-center gap-3">
          {message.priority >= 3 ? (
            <AlertCircle className="h-6 w-6 animate-pulse text-red-400" />
          ) : null}
          <span
            className={`text-[clamp(1.2rem,1.8vw,2.5rem)] font-black uppercase tracking-[0.06em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
              message.priority >= 3 ? "text-red-300" : "text-white"
            }`}
          >
            {message.text}
          </span>
          <span className="ml-8 text-cyan-400 font-black text-[clamp(1.2rem,1.8vw,2.5rem)]">///</span>
        </div>
      ))}
    </div>
  );

  return (
    <footer className="relative z-30 flex h-[6.5vh] min-h-16 items-center overflow-hidden border-t-2 border-amber-300/70 bg-black shadow-[0_-10px_35px_rgba(0,0,0,0.7)] shrink-0">
      <div className="z-10 flex h-full shrink-0 items-center gap-2.5 bg-amber-400 px-[clamp(1.2rem,2vw,2.2rem)] text-slate-950 shadow-[10px_0_25px_rgba(0,0,0,0.6)]">
        <Megaphone className="h-5 w-5 text-slate-950" />
        <span className="text-[clamp(1rem,1.3vw,1.8rem)] font-black uppercase tracking-[0.2em]">
          Info Kenz
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <div className="signage-marquee">
          {group("original")}
          {group("copy")}
        </div>
      </div>
    </footer>
  );
}
