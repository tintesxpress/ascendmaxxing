"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WorkoutSet {
  exerciseId: string;
  exercise?: { name: string; id: string };
  weight: number;
  reps: number;
}

interface WorkoutData {
  id: string;
  date: string;
  startTime: string;
  durationSeconds?: number;
  template?: { name: string };
  sets: WorkoutSet[];
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"history" | "calendar">("history");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function fetchWorkouts() {
    try {
      const res = await fetch("/api/workouts");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setWorkouts(list);
        // Build set of workout dates for calendar
        const dates = new Set<string>();
        for (const w of list) {
          const d = new Date(w.date);
          dates.add(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
        }
        setWorkoutDates(dates);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function formatDuration(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  function getExerciseSummary(sets: WorkoutSet[]): { name: string; count: number; bestWeight: number; bestReps: number }[] {
    const map = new Map<string, { name: string; count: number; bestWeight: number; bestReps: number }>();
    for (const s of sets) {
      if (s.weight === 0 && s.reps === 0) continue;
      const name = s.exercise?.name || "Unknown";
      const existing = map.get(s.exerciseId);
      if (existing) {
        existing.count++;
        if (s.weight > existing.bestWeight) { existing.bestWeight = s.weight; existing.bestReps = s.reps; }
      } else {
        map.set(s.exerciseId, { name, count: 1, bestWeight: s.weight, bestReps: s.reps });
      }
    }
    return Array.from(map.values());
  }

  // Calendar rendering
  function renderCalendar() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Adjust to start on Monday (0=Mon, 6=Sun)
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div className="bg-zinc-900 rounded-xl p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            className="text-zinc-400 text-sm px-2 hover:text-white"
          >‹</button>
          <h3 className="text-white font-bold text-sm">{monthNames[month]} {year}</h3>
          <button
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            className="text-zinc-400 text-sm px-2 hover:text-white"
          >›</button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-zinc-600 text-xs font-medium">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
            const hasWorkout = workoutDates.has(dateStr);
            const isToday = new Date().toISOString().split("T")[0] === dateStr;

            return (
              <div key={i} className="flex flex-col items-center py-1">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  isToday ? "bg-blue-500 text-white font-bold" :
                  hasWorkout ? "text-white" : "text-zinc-600"
                }`}>
                  {day}
                </span>
                {hasWorkout && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-48 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">History</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-zinc-900 rounded-lg p-1">
        <button
          onClick={() => setView("history")}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            view === "history" ? "bg-zinc-700 text-white" : "text-zinc-400"
          }`}
        >
          History
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            view === "calendar" ? "bg-zinc-700 text-white" : "text-zinc-400"
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Calendar View */}
      {view === "calendar" && renderCalendar()}

      {/* Workout List */}
      {workouts.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">No workouts yet</p>
          <p className="text-zinc-600 text-xs mt-1">Start a workout to see your history here</p>
          <Link href="/train" className="text-blue-400 text-sm mt-3 block font-medium">Go to Training →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => {
            const exerciseSummary = getExerciseSummary(w.sets);
            const totalVolume = w.sets
              .filter(s => s.weight > 0 && s.reps > 0)
              .reduce((sum, s) => sum + s.weight * s.reps, 0);
            const totalSets = w.sets.filter(s => s.weight > 0 || s.reps > 0).length;

            return (
              <Link
                key={w.id}
                href={"/workout/" + w.id + "/summary"}
                className="block bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800/80 transition-colors"
              >
                {/* Workout Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-bold text-sm">
                      {w.template?.name || "Empty Workout"}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {new Date(w.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-zinc-600 text-sm">›</span>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 mb-3 text-xs text-zinc-400">
                  {w.durationSeconds && <span>{formatDuration(w.durationSeconds)}</span>}
                  {totalVolume > 0 && <span>{totalVolume.toLocaleString()} lb</span>}
                  {totalSets > 0 && <span>{totalSets} sets</span>}
                </div>

                {/* Exercise Summary */}
                {exerciseSummary.length > 0 && (
                  <div className="space-y-1">
                    {exerciseSummary.slice(0, 6).map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-zinc-400 text-xs">
                          {ex.count} × {ex.name}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          {ex.bestWeight} lb × {ex.bestReps}
                        </span>
                      </div>
                    ))}
                    {exerciseSummary.length > 6 && (
                      <p className="text-zinc-600 text-xs">+{exerciseSummary.length - 6} more</p>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
