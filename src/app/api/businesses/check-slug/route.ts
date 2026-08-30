import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
  }

  const existing = await db.business.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  return NextResponse.json({ available: !existing });
}
