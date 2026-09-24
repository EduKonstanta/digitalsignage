import { redirect } from "next/navigation";

/**
 * Pendaftaran layar sekarang dilakukan lewat modal "Tambah Layar TV" di halaman
 * daftar layar, jadi rute ini hanya mengarahkan ke sana. Menyimpan salinan form
 * di dua tempat membuat keduanya gampang berbeda perilaku saat ada perubahan.
 */
export default function NewScreenRedirectPage() {
  redirect("/screens");
}
