/**
 * Paket per-API `@googleapis/sheets`, bukan paket payung `googleapis`.
 *
 * Yang dipakai di sini hanya Sheets v4 dan GoogleAuth, tetapi `googleapis`
 * memuat ratusan klien API Google sekaligus (dfareporting, youtube, dan
 * seterusnya) sehingga ikut terbundel ke server dan memperlambat cold start.
 * `auth` sengaja diambil dari paket yang sama agar versi google-auth-library
 * yang dipakai klien dan kredensialnya dijamin cocok.
 */
import { auth as googleAuth, sheets as googleSheets } from "@googleapis/sheets";

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function parseServiceAccountCredentials(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum dikonfigurasi");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON atau Base64 JSON yang valid");
    }
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("client_email" in parsed) ||
    !("private_key" in parsed) ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new Error("Credential service account tidak memiliki client_email/private_key");
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
    project_id:
      "project_id" in parsed && typeof parsed.project_id === "string" ? parsed.project_id : undefined,
  };
}

export function isGoogleSheetsConfigured() {
  // The locked source is shared for read access, so reading does not depend
  // on environment-specific credentials. Credentials only enable the more
  // reliable authenticated read path (batchGet) instead of the public CSV
  // export fallback.
  return true;
}

export function hasGoogleSheetsServiceAccount() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

export function getGoogleSheetsServiceAccountEmail() {
  if (!hasGoogleSheetsServiceAccount()) return null;

  try {
    return parseServiceAccountCredentials().client_email;
  } catch {
    return null;
  }
}

export function createGoogleSheetsClient() {
  const credentials = parseServiceAccountCredentials();
  const authClient = new googleAuth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return googleSheets({ version: "v4", auth: authClient });
}
