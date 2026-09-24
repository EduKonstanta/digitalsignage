import { redirect } from "next/navigation";

/**
 * Pairing kode sekarang ditangani modal "Pasangkan Kode" di halaman daftar
 * layar, jadi rute lama ini hanya mengarahkan ke sana.
 */
export default function PairingRedirectPage() {
  redirect("/screens");
}
