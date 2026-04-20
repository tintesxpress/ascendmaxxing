import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const { id, exerciseId } = await params;

    // Verify the template exercise belongs to this template
    const templateExercise = await prisma.templateExercise.findFirst({
      where: { id: exerciseId, templateId: id },
    });

    if (!templateExercise) {
      return NextResponse.json(
        { error: "Template exercise not found" },
        { status: 404 }
      );
    }

    await prisma.templateExercise.delete({
      where: { id: exerciseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template exercise:", error);
    return NextResponse.json(
      { error: "Failed to delete template exercise" },
      { status: 500 }
    );
  }
}
