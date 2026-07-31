import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-background">
      <div className="p-4 rounded-full bg-muted/30 text-muted-foreground mb-4">
        <FileQuestion className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Halaman Tidak Ditemukan (404)</h2>
      <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
        Halaman yang Anda cari tidak tersedia atau alamat URL telah dipindahkan.
      </p>
      <Link href="/dashboard">
        <Button className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Button>
      </Link>
    </div>
  );
}
