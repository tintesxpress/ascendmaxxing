import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get exercise info
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Get all sets for this exercise, grouped by workout
    const sets = await prisma.set.findMany({
      where: { exerciseId: id, reps: { gt: 0 } },
      include: {
        workout: {
          select: { id: true, date: true, startTime: true, template: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group sets by workout
    const workoutMap = new Map<string, {
      workoutId: string;
      date: string;
      templateName: string | null;
      sets: { setNumber: number; weight: number; reps: number; rir: number | null }[];
    }>();

    for (const s of sets) {
      if (!workoutMap.has(s.workout.id)) {
        workoutMap.set(s.workout.id, {
          workoutId: s.workout.id,
          date: s.workout.date.toISOString(),
          templateName: s.workout.template?.name || null,
          sets: [],
        });
      }
      workoutMap.get(s.workout.id)!.sets.push({
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
      });
    }

    const history = Array.from(workoutMap.values());

    // Calculate PRs
    let maxWeight = 0;
    let maxVolume = 0; // single set volume (weight * reps)
    let maxReps = 0;
    let estimated1RM = 0;

    for (const s of sets) {
      if (s.weight > maxWeight) maxWeight = s.weight;
      if (s.reps > maxReps) maxReps = s.reps;
      const volume = s.weight * s.reps;
      if (volume > maxVolume) maxVolume = volume;
      // Epley formula: 1RM = weight * (1 + reps/30)
      const e1rm = s.weight * (1 + s.reps / 30);
      if (e1rm > estimated1RM) estimated1RM = e1rm;
    }

    return NextResponse.json({
      exercise,
      history,
      records: {
        maxWeight,
        maxReps,
        maxVolume,
        estimated1RM: Math.round(estimated1RM),
        totalSets: sets.length,
        totalWorkouts: history.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch exercise history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
