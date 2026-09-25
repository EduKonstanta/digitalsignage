import { describe, it, expect } from "vitest";
import { formatAttendanceAnnouncementText, toSpokenName } from "@/lib/cinema-announcement";
import { resolvePitch, selectVoice } from "@/lib/cinema-audio";

function voice(name: string, lang = "id-ID") {
  return { name, lang } as SpeechSynthesisVoice;
}

describe("toSpokenName", () => {
  it("mengubah nama kapital semua menjadi huruf awal kapital", () => {
    expect(toSpokenName("FARID FACHRUDIN")).toBe("Farid Fachrudin");
    expect(toSpokenName("SITI NUR-HALIZA  O'BRIEN")).toBe("Siti Nur-Haliza O'Brien");
  });

  it("membiarkan nama yang sudah campuran huruf", () => {
    expect(toSpokenName("Muhammad Al Fatih")).toBe("Muhammad Al Fatih");
  });
});

describe("formatAttendanceAnnouncementText", () => {
  it("menyebut nama, telah hadir, dan semangat belajar untuk CHECK_IN", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const text = formatAttendanceAnnouncementText({
        studentName: "BUDI SANTOSO",
        type: "CHECK_IN",
        seed,
      });
      expect(text).toContain("Budi Santoso");
      expect(text).toContain("telah hadir");
      expect(text).toContain("Konstanta Education");
      expect(text).toContain("Semangat belajar");
    }
  });

  it("memilih variasi yang sama untuk seed yang sama", () => {
    const args = { studentName: "Budi", type: "CHECK_IN" as const, seed: "log-123" };
    expect(formatAttendanceAnnouncementText(args)).toBe(formatAttendanceAnnouncementText(args));
  });

  it("memakai kalimat pulang untuk CHECK_OUT", () => {
    const text = formatAttendanceAnnouncementText({ studentName: "Budi", type: "CHECK_OUT" });
    expect(text).toContain("Budi");
    expect(text).not.toContain("telah hadir");
  });
});

describe("selectVoice", () => {
  const voices = [
    voice("Microsoft Gadis Online (Natural) - Indonesian (Indonesia)"),
    voice("Microsoft Ardi Online (Natural) - Indonesian (Indonesia)"),
    voice("Microsoft Zira - English (United States)", "en-US"),
  ];

  it("memilih suara pria untuk MALE dan wanita untuk FEMALE", () => {
    expect(selectVoice(voices, { gender: "MALE" }).voice.name).toContain("Ardi");
    expect(selectVoice(voices, { gender: "FEMALE" }).voice.name).toContain("Gadis");
  });

  it("tidak salah mengira 'Female' sebagai pria (substring 'male')", () => {
    const onlyFemale = [voice("Indonesian Female"), voice("Indonesian Woman", "id-ID")];
    const result = selectVoice(onlyFemale, { gender: "MALE" });
    expect(result.genderMatched).toBe(false);
  });

  it("melaporkan genderMatched=false bila tidak ada suara yang cocok", () => {
    const single = [voice("Google Bahasa Indonesia")];
    const result = selectVoice(single, { gender: "MALE" });
    expect(result.voice.name).toBe("Google Bahasa Indonesia");
    expect(result.genderMatched).toBe(false);
  });
});

describe("resolvePitch", () => {
  it("menggeser nada lebih jauh saat tidak ada suara berbeda per gender", () => {
    expect(resolvePitch("MALE", false)).toBeLessThan(resolvePitch("MALE", true));
    expect(resolvePitch("FEMALE", false)).toBeGreaterThan(resolvePitch("FEMALE", true));
    expect(resolvePitch("AUTO", false)).toBe(resolvePitch("AUTO", true));
  });
});
