import { NextResponse } from "next/server";

export interface ApiResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export function apiSuccess<T>(data: T, meta?: ApiResponseMeta, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function apiError(message: string, code = "INTERNAL_SERVER_ERROR", status = 500, details?: unknown) {
  let clientDetails = details;

  // Never leak raw Error objects (e.g. Prisma errors) to the client — log
  // the full error server-side and only forward a message in development.
  if (details instanceof Error) {
    console.error(`[API_ERROR] ${code}: ${message}`, details);
    clientDetails = process.env.NODE_ENV === "development" ? details.message : undefined;
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: clientDetails,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
