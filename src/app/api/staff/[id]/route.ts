import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession, hashPassword, normalizePhoneNumber } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized: Only the owner can update staff" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, role, isActive, newPassword } = body;

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Prevent owner from disabling or changing their own role
    if (targetUser._id.toString() === session.userId) {
      if (isActive === false) {
        return NextResponse.json(
          { error: "Owner cannot deactivate their own account" },
          { status: 400 }
        );
      }
      if (role && role !== "OWNER") {
        return NextResponse.json(
          { error: "Owner cannot demote their own account" },
          { status: 400 }
        );
      }
    }

    if (name && typeof name === "string") {
      targetUser.name = name.trim();
    }
    if (phone && typeof phone === "string") {
      targetUser.phone = normalizePhoneNumber(phone);
    }
    if (role === "OWNER" || role === "STAFF") {
      targetUser.role = role;
    }
    if (typeof isActive === "boolean") {
      targetUser.isActive = isActive;
    }
    if (newPassword && newPassword.length >= 4) {
      targetUser.passwordHash = await hashPassword(newPassword);
    }

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: "Staff member updated successfully",
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        phone: targetUser.phone,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized: Only the owner can delete staff" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    if (id === session.userId) {
      return NextResponse.json(
        { error: "Owner cannot delete their own account" },
        { status: 400 }
      );
    }

    const targetUser = await User.findByIdAndDelete(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
