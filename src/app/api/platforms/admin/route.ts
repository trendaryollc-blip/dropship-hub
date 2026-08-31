import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isOwner } from "@/lib/auth";
import {
  getAllPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  addPlatformKey,
  removePlatformKey,
  updatePlatformKey,
  reorderPlatformKeys,
  resetKeyUsage,
  type PlatformInput,
} from "@/lib/platform-config";

// GET — list all platforms
export async function GET(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const platforms = await getAllPlatforms();
    return NextResponse.json({ platforms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

// POST — add new platform
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { action } = body;

    // ── Key management sub-actions ──
    if (action === "add_key") {
      const { platformId, key, label, requestsLimit, resetDate } = body;
      if (!platformId || !key) {
        return NextResponse.json({ error: "platformId and key are required" }, { status: 400 });
      }
      await addPlatformKey(platformId, key, label || "Fallback", requestsLimit || 100, resetDate || "");
      return NextResponse.json({ success: true });
    }

    if (action === "remove_key") {
      const { platformId, keyId } = body;
      if (!platformId || !keyId) {
        return NextResponse.json({ error: "platformId and keyId are required" }, { status: 400 });
      }
      await removePlatformKey(platformId, keyId);
      return NextResponse.json({ success: true });
    }

    if (action === "update_key") {
      const { platformId, keyId, updates } = body;
      if (!platformId || !keyId) {
        return NextResponse.json({ error: "platformId and keyId are required" }, { status: 400 });
      }
      await updatePlatformKey(platformId, keyId, updates);
      return NextResponse.json({ success: true });
    }

    if (action === "reset_usage") {
      const { platformId, keyId } = body;
      if (!platformId || !keyId) {
        return NextResponse.json({ error: "platformId and keyId are required" }, { status: 400 });
      }
      await resetKeyUsage(platformId, keyId);
      return NextResponse.json({ success: true });
    }

    if (action === "reorder_keys") {
      const { platformId, keyIds } = body;
      if (!platformId || !Array.isArray(keyIds)) {
        return NextResponse.json({ error: "platformId and keyIds array are required" }, { status: 400 });
      }
      await reorderPlatformKeys(platformId, keyIds);
      return NextResponse.json({ success: true });
    }

    if (action === "clear_cooldowns") {
      const { getAllPlatforms } = await import("@/lib/platform-config");
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const allPlatforms = await getAllPlatforms();
      const db = await getAdminDB();
      for (const p of allPlatforms) {
        await db.collection("platforms").doc(p.id).update({
          cooldownUntil: null,
          lastHealth: "untested",
          lastError: null,
        });
      }
      return NextResponse.json({ success: true, message: `Cleared cooldowns for ${allPlatforms.length} platforms` });
    }

    // ── Create new platform ──
    const input: PlatformInput = {
      name: body.name,
      method: body.method,
      enabled: body.enabled,
      apiKey: body.apiKey,
      keyLabel: body.keyLabel,
      requestsLimit: body.requestsLimit,
      resetDate: body.resetDate,
    };

    if (!input.name || !input.method) {
      return NextResponse.json({ error: "name and method are required" }, { status: 400 });
    }

    const platform = await createPlatform(input);
    return NextResponse.json({ platform });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create platform" },
      { status: 500 }
    );
  }
}

// PUT — update platform settings
export async function PUT(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Platform id is required" }, { status: 400 });
    }

    await updatePlatform(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update platform" },
      { status: 500 }
    );
  }
}

// DELETE — remove platform
export async function DELETE(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Platform id is required" }, { status: 400 });
    }

    await deletePlatform(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete platform" },
      { status: 500 }
    );
  }
}
