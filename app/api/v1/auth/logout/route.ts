import { revokeCurrentSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-response";

export async function POST() {
  await revokeCurrentSession();
  return apiSuccess({ message: "Logout berhasil" });
}
