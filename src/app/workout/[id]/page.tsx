"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { classifySet, setTypeLabel, setTypeColor, formatDuration } from "@/lib/utils";

interface Set {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  setType: string;
}

interface Exercise {
  id: string;
  name: string;
}

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: Set[];
}

interface Workout {
  id: string;
  startTime: string;
  exercises: WorkoutExercise[];
}

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("");
  const [logging, setLogging] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);

  useEffect(() => {
    fetchWorkout();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) {
      setRestTimer(null);
      return;
    }
    const interval = setTimeout(() => setRestTimer(restTimer + 1), 1000);
    return () => clearTimeout(interval);
  }, [restTimer]);

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

  async function logSet() {
    if (!weight || !reps || !workout) return;
    setLogging(true);
    try {
      const repsNum = parseInt(reps);
      const classification = classifySet(repsNum);
      const res = await fetch(`/api/workouts/${id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: workout.exercises[currentExerciseIdx].exercise.id,
          weight: parseFloat(weight),
          reps: repsNum,
          rir: rir ? parseInt(rir) : undefined,
          setType: classification,
        }),
      });
      if (res.ok) {
        setWeight("");
        setReps("");
        setRir("");
        setRestTimer(0);
        fetchWorkout();
      }
    } catch (error) {
      console.error("Failed to log set:", error);
    } finally {
      setLogging(false);
    }
  }

  async function endWorkout() {
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: elapsed }),
      });
      if (res.ok) {
        router.push(`/workout/${id}/summary`);
      }
    } catch (error) {
      console.error("Failed to end workout:", error);
    }
  }

  if (loading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  if (!workout || workout.exercises.length === 0) {
    return <div className="text-zinc-400">No exercises in workout</div>;
  }

  const currentExercise = workout.exercises[currentExerciseIdx];
  const canGoNext = currentExerciseIdx < workout.exercises.length - 1;
  const canGoPrev = currentExerciseIdx > 0;

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 z-50 flex items-center justify-between">
        <div className="text-2xl font-bold text-white tabular-nums">
          {formatDuration(elapsed)}
        </div>
        <button
          onClick={endWorkout}
          className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 font-semibold text-sm transition-colors"
        >
          End Workout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {/* Current Exercise */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-6">
          <h2 className="text-2xl font-bold text-white">{currentExercise.exercise.name}</h2>
          <p className="text-zinc-500 text-sm mt-2">Exercise {currentExerciseIdx + 1} of {workout.exercises.length}</p>
        </div>

        {/* Sets List */}
        <div className="space-y-2 mb-6">
          <h3 className="text-sm font-semibold text-zinc-400">Logged Sets</h3>
          {currentExercise.sets.length === 0 ? (
            <p className="text-zinc-500 text-sm">No sets logged yet</p>
          ) : (
            currentExercise.sets.map((s) => (
              <div key={s.id} className="bg-zinc-900 rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-white">
                    #{s.setNumber}: {s.weight} x {s.reps}
                    {s.rir !== undefined && ` @ RIR ${s.rir}`}
                  </p>
                </div>
                <span className={`${setTypeColor(s.setType)} text-white text-xs font-semibold px-2 py-1 rounded`}>
                  {setTypeLabel(s.setType)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Rest Timer */}
        {restTimer !== null && (
          <div className="bg-zinc-900 rounded-xl p-4 mb-6 text-center">
            <p className="text-zinc-400 text-sm mb-2">Rest Time</p>
            <p className="text-3xl font-bold text-white tabular-nums">{restTimer}s</p>
            <button
              onClick={() => setRestTimer(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 mt-3 font-semibold transition-colors"
            >
              Next Set
            </button>
          </div>
        )}

        {/* Set Logging */}
        {restTimer === null && (
          <div className="bg-zinc-900 rounded-xl p-4 space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-zinc-300">Log Set</h3>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Weight (lbs)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="RIR"
                value={rir}
                onChange={(e) => setRir(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <button
              onClick={logSet}
              disabled={logging || !weight || !reps}
              className="w-full bg-white text-black rounded-lg p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {logging ? "Logging..." : "Log Set"}
            </button>
          </div>
        )}

        {/* Exercise Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentExerciseIdx(currentExerciseIdx - 1)}
            disabled={!canGoPrev}
            className="flex-1 bg-zinc-800 text-white rounded-lg p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentExerciseIdx(currentExerciseIdx + 1)}
            disabled={!canGoNext}
            className="flex-1 bg-zinc-800 text-white rounded-lg p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
