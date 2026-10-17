import { NextResponse } from "next/server";
const retired = () => NextResponse.json({ error: "Website commerce is retired. Use Website Management editorial tools." }, { status: 410 });
export const GET = retired;
export const POST = retired;
export const PATCH = retired;
export const DELETE = retired;
