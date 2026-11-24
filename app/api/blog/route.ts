import { NextResponse } from "next/server";
import { getBlogPosts, getBlogSidebarData } from "@/services/blog.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "4", 10)));
    const category = searchParams.get("category") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const includeSidebar = searchParams.get("includeSidebar") === "true";

    const postsData = await getBlogPosts({ category, tag, page, limit });

    if (!includeSidebar) {
      return NextResponse.json(
        {
          success: true,
          ...postsData,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          },
        }
      );
    }

    const sidebarData = await getBlogSidebarData();

    return NextResponse.json(
      {
        success: true,
        ...postsData,
        ...sidebarData,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching blog articles from database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load blog posts" },
      { status: 500 }
    );
  }
}
