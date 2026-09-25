import { describe, expect, it } from "vitest";
import { FIELD_LABELS, normalizeGender, normalizePhone, parseStudentCsv } from "@/lib/student-import";

describe("normalizePhone", () => {
  it("mengubah awalan 0 menjadi 62", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });

  it("menambahkan 62 pada nomor yang diawali 8", () => {
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });

  it("membiarkan nomor yang sudah 62", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });

  it("membuang spasi, tanda hubung, dan tanda kurung", () => {
    expect(normalizePhone("(0812) 3456-7890")).toBe("6281234567890");
  });

  it("mengembalikan null bila tidak ada angka sama sekali", () => {
    expect(normalizePhone("-")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("normalizeGender", () => {
  it("mengenali penulisan Indonesia dan Inggris", () => {
    expect(normalizeGender("L")).toBe("MALE");
    expect(normalizeGender("laki-laki")).toBe("MALE");
    expect(normalizeGender("P")).toBe("FEMALE");
    expect(normalizeGender("Perempuan")).toBe("FEMALE");
  });

  it("jatuh ke AUTO bila tidak dikenali", () => {
    expect(normalizeGender("")).toBe("AUTO");
    expect(normalizeGender("entah")).toBe("AUTO");
  });
});

describe("parseStudentCsv", () => {
  it("mencocokkan header berbahasa Indonesia", () => {
    const result = parseStudentCsv(
      "NIS,Nama Siswa,Rombel,No. HP Ortu\n2026001,Raka Pratama,12 IPA 1,081234567890",
    );
    expect(result.missingRequired).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      nis: "2026001",
      name: "Raka Pratama",
      className: "12 IPA 1",
      parentPhone: "6281234567890",
      errors: [],
    });
  });

  /** Excel berbahasa Indonesia mengekspor CSV dengan titik koma. */
  it("mengenali pemisah titik koma", () => {
    const result = parseStudentCsv("NIS;Nama;Kelas\n2026001;Raka;12 IPA 1");
    expect(result.delimiter).toBe(";");
    expect(result.rows[0].name).toBe("Raka");
  });

  it("menghormati tanda kutip pada sel yang memuat pemisah", () => {
    const result = parseStudentCsv('NIS,Nama,Kelas\n2026001,"Pratama, Raka",12 IPA 1');
    expect(result.rows[0].name).toBe("Pratama, Raka");
  });

  /** "No HP Ortu" tidak boleh keburu direbut sebutan yang lebih pendek, "no hp". */
  it("memilih sebutan terpanjang saat dua kolom mirip", () => {
    const result = parseStudentCsv(
      "NIS,Nama,Kelas,No HP,No HP Ortu\n1,Raka,12 IPA 1,081234567890,081234567899",
    );
    expect(result.rows[0].parentPhone).toBe("6281234567899");
    expect(result.rows[0].studentPhone).toBe("6281234567890");
  });

  it("melaporkan kolom wajib yang tidak ditemukan", () => {
    const result = parseStudentCsv("Kelas,Alamat\n12 IPA 1,Jakarta");
    expect(result.missingRequired).toEqual(["name"]);
  });

  /**
   * Hanya nama yang menggagalkan baris. NIS dan kelas dibuatkan sendiri oleh
   * endpoint impor, jadi kosongnya cukup menjadi peringatan.
   */
  it("hanya menolak baris yang namanya kosong", () => {
    const result = parseStudentCsv("NIS,Nama,Kelas\n,Raka,12 IPA 1\n2026002,,12 IPA 2");
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].warnings).toContain("NIS kosong — dibuatkan otomatis");
    expect(result.rows[1].errors).toContain("Nama kosong");
  });

  it("memperingatkan baris tanpa UID kartu", () => {
    const result = parseStudentCsv("Nama,UID Kartu\nRaka,\nBudi,04AABBCC");
    expect(result.rows[0].warnings.some((w) => w.includes("UID kartu kosong"))).toBe(true);
    expect(result.rows[1].warnings.some((w) => w.includes("UID kartu kosong"))).toBe(false);
  });

  it("menandai UID kartu ganda di dalam satu berkas", () => {
    const result = parseStudentCsv("Nama,UID Kartu\nRaka,04AABBCC\nBudi,04AABBCC");
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors[0]).toMatch(/UID kartu .* dua kali/);
  });

  it("menandai NIS ganda di dalam satu berkas", () => {
    const result = parseStudentCsv("NIS,Nama,Kelas\n1,Raka,A\n1,Budi,B");
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors[0]).toMatch(/dua kali/);
  });

  it("mengabaikan baris kosong di ujung berkas", () => {
    const result = parseStudentCsv("NIS,Nama,Kelas\n1,Raka,A\n\n\n");
    expect(result.rows).toHaveLength(1);
  });

  it("menomori baris sesuai tampilan di aplikasi spreadsheet", () => {
    const result = parseStudentCsv("NIS,Nama,Kelas\n1,Raka,A\n2,Budi,B");
    expect(result.rows.map((row) => row.rowNumber)).toEqual([2, 3]);
  });

  it("mengembalikan hasil kosong untuk masukan kosong", () => {
    const result = parseStudentCsv("   ");
    expect(result.rows).toEqual([]);
    expect(result.missingRequired).toEqual(["name"]);
  });
});

describe("label kolom modal impor", () => {
  it("setiap label yang ditampilkan dikenali sebagai kolomnya sendiri", () => {
    const fields = Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[];
    const header = fields.map((field) => FIELD_LABELS[field]).join(",");
    const result = parseStudentCsv(`${header}\n${fields.map(() => "x").join(",")}`);
    for (const [index, field] of fields.entries()) {
      expect(result.mapping[field]).toBe(index);
    }
  });

  it("mengenali kolom L/P sebagai gender suara", () => {
    const result = parseStudentCsv("Nama,L/P\nRaka,L\nSiti,P");
    expect(result.rows.map((row) => row.voiceGender)).toEqual(["MALE", "FEMALE"]);
  });
});
