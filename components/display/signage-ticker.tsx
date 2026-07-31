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
        <div key={`${message.id}-${suffix}`} className="mx-8 inline-flex items-center gap-2">
          {message.priority >= 3 ? (
            <AlertCircle className="h-4 w-4 animate-pulse text-red-400" />
          ) : null}
          <span
            className={`text-[clamp(.72rem,1.05vw,1.2rem)] font-bold uppercase tracking-[0.06em] ${
              message.priority >= 3 ? "text-red-300" : "text-white"
            }`}
          >
            {message.text}
          </span>
          <span className="ml-5 text-cyan-300/50">///</span>
        </div>
      ))}
    </div>
  );

  return (
    <footer className="relative z-30 flex h-[5vh] min-h-11 items-center overflow-hidden border-t border-amber-300/50 bg-black shadow-[0_-10px_30px_rgba(0,0,0,.45)]">
      <div className="z-10 flex h-full shrink-0 items-center gap-2 bg-amber-300 px-[clamp(.8rem,1.5vw,1.5rem)] text-slate-950 shadow-[8px_0_22px_rgba(0,0,0,.45)]">
        <Megaphone className="h-4 w-4" />
        <span className="text-[clamp(.65rem,.8vw,.9rem)] font-black uppercase tracking-[0.18em]">
          Kepoin
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
