import { NextRequest, NextResponse } from "next/server"
import { UltraDuplicatePrevention } from "@/lib/ultra-duplicate-prevention"
import { NuclearDuplicatePrevention } from "@/lib/nuclear-duplicate-prevention"
import { GlobalDuplicatePrevention } from "@/lib/global-duplicate-prevention"

export async function POST(req: NextRequest) {
  try {
    const cleared: string[] = []
    try { UltraDuplicatePrevention.clear(); cleared.push("ultra"); } catch {}
    try { NuclearDuplicatePrevention.nuclearClear(); cleared.push("nuclear"); } catch {}
    try { GlobalDuplicatePrevention.clear(); cleared.push("global"); } catch {}
    return NextResponse.json({ success: true, cleared })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}




