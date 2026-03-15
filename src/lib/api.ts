import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, issues?: unknown) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function internalServerError(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 500 });
}

export function notImplemented(message: string) {
  return NextResponse.json({ error: message }, { status: 501 });
}

export function fromZodError(error: ZodError) {
  return badRequest("Validation failed", error.flatten());
}
