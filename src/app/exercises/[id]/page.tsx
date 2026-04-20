"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";

interface ExerciseInfo {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string | null;
  category: string | null;
}

interface HistorySet {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
}

interface WorkoutHistory {
  workoutId: string;
  date: string;
  templateName: string | null;
  sets: HistorySet[];
}

interface Records {
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
  estimated1RM: number;
  totalSets: number;
  totalWorkouts: number;
}

export default function ExerciseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<ExerciseInfo | null>(null);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [records, setRecords] = useState<Records | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch("/api/exercises/" + id + "/history");
        if (res.ok) {
          const data = await res.json();
          setExercise(data.exercise);
          setHistory(data.history);
          setRecords(data.records);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetch_data();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-48 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Exercise not found</p>
        <Link href="/train" className="text-blue-400 text-sm mt-2 block">Back to Training</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div>
        <Link href="/train" className="text-blue-400 text-sm font-medium">← Back</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{exercise.name}</h1>
        <div className="flex gap-2 mt-1">
          <span className="text-zinc-500 text-xs capitalize">{exercise.primaryMuscle}</span>
          {exercise.equipment && (
            <span className="text-zinc-600 text-xs">· {exercise.equipment}</span>
          )}
          {exercise.category && (
            <span className="text-zinc-600 text-xs">· {exercise.category}</span>
          )}
        </div>
      </div>

      {/* Personal Records */}
      {records && records.totalSets > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Personal Records</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Best Weight</p>
              <p className="text-xl font-bold text-white">{records.maxWeight} <span className="text-zinc-500 text-sm font-normal">lbs</span></p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Est. 1RM</p>
              <p className="text-xl font-bold text-yellow-400">{records.estimated1RM} <span className="text-zinc-500 text-sm font-normal">lbs</span></p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Best Volume</p>
              <p className="text-xl font-bold text-white">{records.maxVolume.toLocaleString()} <span className="text-zinc-500 text-sm font-normal">lbs</span></p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Max Reps</p>
              <p className="text-xl font-bold text-white">{records.maxReps}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Total Sets</p>
              <p className="text-xl font-bold text-zinc-300">{records.totalSets}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-zinc-500 text-xs">Workouts</p>
              <p className="text-xl font-bold text-zinc-300">{records.totalWorkouts}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workout History */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">History</h2>
        {history.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">No history yet</p>
            <p className="text-zinc-600 text-xs mt-1">Complete a workout with this exercise to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((w) => {
              const totalVolume = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
              return (
                <Link
                  key={w.workoutId}
                  href={"/workout/" + w.workoutId + "/summary"}
                  className="block bg-zinc-900 rounded-xl p-3 hover:bg-zinc-800/80 transition-colors"
                >
                  {/* Date and template */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {new Date(w.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {w.templateName && (
                        <p className="text-zinc-500 text-xs">{w.templateName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400 text-xs">{w.sets.length} sets</p>
                      <p className="text-zinc-500 text-xs">{totalVolume.toLocaleString()} lbs</p>
                    </div>
                  </div>

                  {/* Set table */}
                  <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-zinc-600 mb-1">
                    <div className="col-span-2">SET</div>
                    <div className="col-span-4 text-center">LBS</div>
                    <div className="col-span-3 text-center">REPS</div>
                    <div className="col-span-3 text-center">VOL</div>
                  </div>
                  {w.sets.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 text-sm py-0.5">
                      <div className="col-span-2 text-zinc-500">{idx + 1}</div>
                      <div className="col-span-4 text-center text-white">{s.weight}</div>
                      <div className="col-span-3 text-center text-white">{s.reps}</div>
                      <div className="col-span-3 text-center text-zinc-400">{(s.weight * s.reps).toLocaleString()}</div>
                    </div>
                  ))}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
