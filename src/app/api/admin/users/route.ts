import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listUsers, setUserRole, setUserBanned } from "@/lib/roles";

export const GET = requireOwner(async (request: NextRequest, uid: string) => {
  try {
    const users = await listUsers(200);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[AdminUsers] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
});

export const PATCH = requireOwner(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { uid: targetUid, role, banned } = body;

    if (!targetUid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Prevent banning/demoting yourself
    if (targetUid === uid) {
      return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
    }

    if (role !== undefined) {
      const valid = ["owner", "admin", "user"];
      if (!valid.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      await setUserRole(targetUid, role);
    }

    if (banned !== undefined) {
      await setUserBanned(targetUid, banned);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminUsers] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
});
