import { type NextRequest, NextResponse } from "next/server";
import type { Language } from "@/lib/translations";

const FR_COUNTRIES = new Set(["FR", "BE", "LU", "MC", "SN", "CI", "ML", "BF", "TN", "MA", "DZ", "CM", "MG", "CD"]);
const DE_COUNTRIES = new Set(["DE", "AT", "CH", "LI", "LU"]);

export function GET(request: NextRequest): NextResponse<{ lang: Language }> {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    "";

  if (DE_COUNTRIES.has(country)) return NextResponse.json({ lang: "de" });
  if (FR_COUNTRIES.has(country)) return NextResponse.json({ lang: "fr" });

  const accept = request.headers.get("accept-language") ?? "";
  const primary = accept.split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";

  if (primary.startsWith("fr")) return NextResponse.json({ lang: "fr" });
  if (primary.startsWith("de")) return NextResponse.json({ lang: "de" });

  return NextResponse.json({ lang: "en" });
}
