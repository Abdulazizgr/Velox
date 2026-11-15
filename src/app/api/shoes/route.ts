import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Shoe } from "@/models/Shoe";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const extendedType = searchParams.get("extendedType");
    const sizeParam = searchParams.get("size");
    const isExtendedParam = searchParams.get("isExtended");

    const query: any = {};
    if (extendedType) {
      query.extendedType = extendedType;
    }
    if (isExtendedParam === "true") {
      query.isExtended = true;
    } else if (isExtendedParam === "false") {
      query.isExtended = { $ne: true };
    }
    if (sizeParam) {
      const sNum = Number(sizeParam);
      query.$or = [{ size: sNum }, { coveredSizes: sNum }];
    }

    const shoes = await Shoe.find(query).sort({ size: 1, shoeId: 1 }).lean();
    return NextResponse.json({ shoes });
  } catch (error) {
    console.error("Fetch shoes error:", error);
    return NextResponse.json({ error: "Failed to fetch shoes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Only owners can add shoes" }, { status: 403 });
    }

    const body = await req.json();
    const { shoeId, size, type, notes, isExtended, extendedType, coveredSizes } = body;

    if (!shoeId) {
      return NextResponse.json(
        { error: "Shoe ID tag is required" },
        { status: 400 }
      );
    }

    const extended = Boolean(isExtended);
    let parsedSize = Number(size);
    let parsedCoveredSizes: number[] = [];

    if (extended) {
      if (!extendedType || !["EXTENDED_SMALL", "EXTENDED_MEDIUM", "EXTENDED_LARGE"].includes(extendedType)) {
        return NextResponse.json(
          { error: "Valid extended type (EXTENDED_SMALL, EXTENDED_MEDIUM, or EXTENDED_LARGE) is required" },
          { status: 400 }
        );
      }

      if (Array.isArray(coveredSizes) && coveredSizes.length > 0) {
        parsedCoveredSizes = Array.from(
          new Set(coveredSizes.map((n: any) => Number(n)).filter((n) => !isNaN(n) && n > 0))
        ).sort((a, b) => a - b);
      } else {
        // Sensible defaults if not explicitly passed
        if (extendedType === "EXTENDED_SMALL") parsedCoveredSizes = [31, 32, 33, 34];
        else if (extendedType === "EXTENDED_MEDIUM") parsedCoveredSizes = [35, 36, 37, 38];
        else if (extendedType === "EXTENDED_LARGE") parsedCoveredSizes = [39, 40, 41, 42];
      }

      if (isNaN(parsedSize) || parsedSize <= 0) {
        parsedSize = parsedCoveredSizes[0] || 35;
      }
    } else {
      if (!size || isNaN(parsedSize) || parsedSize <= 0) {
        return NextResponse.json(
          { error: "Valid shoe size number is required" },
          { status: 400 }
        );
      }
    }

    await connectDB();
    const formattedShoeId = shoeId.trim().toUpperCase();

    const existing = await Shoe.findOne({ shoeId: formattedShoeId });
    if (existing) {
      return NextResponse.json(
        { error: `Shoe with ID "${formattedShoeId}" already exists.` },
        { status: 409 }
      );
    }

    const skateType = type === "QUAD" ? "QUAD" : "INLINE";

    const newShoe = await Shoe.create({
      shoeId: formattedShoeId,
      size: parsedSize,
      isExtended: extended,
      extendedType: extended ? extendedType : undefined,
      coveredSizes: extended ? parsedCoveredSizes : [],
      type: skateType,
      status: "AVAILABLE",
      notes: notes || "",
    });

    return NextResponse.json({ success: true, shoe: newShoe }, { status: 201 });
  } catch (error) {
    console.error("Create shoe error:", error);
    return NextResponse.json({ error: "Failed to create shoe" }, { status: 500 });
  }
}

