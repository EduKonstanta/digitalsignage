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
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
