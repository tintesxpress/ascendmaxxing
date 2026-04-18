"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { formatDuration, setTypeLabel } from "@/lib/utils";

interface Set {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  setType: string;
  exercise: {
    primaryMuscle: string;
  };
}

interface Workout {
  id: string;
  durationSeconds: number;
  sets: Set[];
}

export default function WorkoutSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkout() {
      try {
        const res = await fetch(`/api/workouts/${id}`);
        if (res.ok) {
          setWorkout(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch workout:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkout();
  }, [id]);

  if (loading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  if (!workout) {
    return <div className="text-zinc-400">Workout not found</div>;
  }

  const totalVolume = workout.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const muscleGroups: Record<string, number> = {};
  workout.sets.forEach((s) => {
    const muscle = s.exercise.primaryMuscle;
    muscleGroups[muscle] = (muscleGroups[muscle] || 0) + 1;
  });

  const setTypes: Record<string, number> = {};
  workout.sets.forEach((s) => {
    setTypes[s.setType] = (setTypes[s.setType] || 0) + 1;
  });

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-bold text-white">Workout Summary</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-zinc-500 text-sm mb-1">Duration</p>
          <p className="text-2xl font-bold text-white">{formatDuration(workout.durationSeconds)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-zinc-500 text-sm mb-1">Total Sets</p>
          <p className="text-2xl font-bold text-white">{workout.sets.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 col-span-2">
          <p className="text-zinc-500 text-sm mb-1">Total Volume</p>
          <p className="text-2xl font-bold text-white">{totalVolume.toFixed(0)} lbs</p>
        </div>
      </div>

      {/* Sets by Muscle Group */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Sets by Muscle Group</h2>
        <div className="space-y-2">
          {Object.entries(muscleGroups).map(([muscle, count]) => (
            <div key={muscle} className="flex items-center justify-between">
              <span className="text-zinc-400 capitalize">{muscle}</span>
              <span className="text-white font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Set Type Distribution */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Set Type Distribution</h2>
        <div className="space-y-2">
          {Object.entries(setTypes).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-zinc-400">{setTypeLabel(type)}</span>
              <span className="text-white font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Done Button */}
      <Link
        href="/train"
        className="block w-full bg-white text-black rounded-lg p-4 font-bold text-center text-lg hover:bg-zinc-100 transition-colors"
      >
        Done
      </Link>
    </div>
  );
}
