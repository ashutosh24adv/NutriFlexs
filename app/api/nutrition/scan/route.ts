import { NextRequest } from "next/server";
import { POST as analyzeImagePost } from "../analyze-image/route";

export const dynamic = "force-dynamic";

/**
 * Backward compatibility alias for /api/nutrition/analyze-image
 */
export async function POST(req: NextRequest) {
  return analyzeImagePost(req);
}
