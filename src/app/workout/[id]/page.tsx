"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

interface SetData {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  completed?: boolean;
}

interface ExerciseInfo {
  id: string;
  name: string;
  primaryMuscle: string;
}

interface WorkoutExercise {
  exerciseId: string;
  exercise: ExerciseInfo;
  sets: SetData[];
}

interface Workout {
  id: string;
  startTime: string;
  template?: { name: string };
  exercises: WorkoutExercise[];
}

interface SearchResult {
  id: string;
  name: string;
  primaryMuscle: string;
}

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Per-exercise draft sets: exerciseId -> { weight, reps }
  const [draftSets, setDraftSets] = useState<Record<string, { weight: string; reps: string }>>({});
  const [loggingSet, setLoggingSet] = useState<string | null>(null);

  // Rest timer
  const [restTime, setRestTime] = useState<number | null>(null);
  const [restTarget] = useState(90); // default 90s rest

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Cancel confirmation
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { fetchWorkout(); }, [id]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (restTime === null) return;
    const interval = setInterval(() => {
      setRestTime(t => {
        if (t === null) return null;
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTime !== null]);

  async function fetchWorkout() {
    try {
      const res = await fetch("/api/workouts/" + id);
      if (res.ok) setWorkout(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function getDraft(exerciseId: string) {
    return draftSets[exerciseId] || { weight: "", reps: "" };
  }

  function updateDraft(exerciseId: string, field: "weight" | "reps", value: string) {
    setDraftSets(prev => ({
      ...prev,
      [exerciseId]: { ...getDraft(exerciseId), [field]: value },
    }));
  }

  async function logSet(exerciseId: string) {
    const draft = getDraft(exerciseId);
    if (!draft.weight || !draft.reps) return;

    setLoggingSet(exerciseId);
    try {
      const res = await fetch("/api/workouts/" + id + "/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          weight: parseFloat(draft.weight),
          reps: parseInt(draft.reps),
        }),
      });
      if (res.ok) {
        // Keep weight for next set, clear reps
        setDraftSets(prev => ({
          ...prev,
          [exerciseId]: { weight: draft.weight, reps: "" },
        }));
        setRestTime(0);
        fetchWorkout();
      }
    } catch (e) { console.error(e); }
    setLoggingSet(null);
  }

  async function addExerciseToWorkout(exerciseId: string) {
    // Log a placeholder set with 0 weight/0 reps to register the exercise
    // Actually, we should just add the exercise. Let's log an empty set approach:
    // Better: we add to the workout by logging a first set. For now, close modal and scroll.
    setShowAddExercise(false);
    setExerciseSearch("");
    setSearchResults([]);

    // Add exercise by logging a set with 0/0 that we'll replace
    // Actually let's just use the sets endpoint - the workout will show the exercise
    // We need a way to add an exercise without a set. Let's use a dedicated approach.
    // For now, pre-fill the draft and let user log their first set:
    setDraftSets(prev => ({
      ...prev,
      [exerciseId]: { weight: "", reps: "" },
    }));

    // We need to actually register this exercise in the workout
    // Let's create a set with 0/0 and then user replaces it
    try {
      await fetch("/api/workouts/" + id + "/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: 0, reps: 0 }),
      });
      fetchWorkout();
    } catch (e) { console.error(e); }
  }

  async function searchExercises(q: string) {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch("/api/exercises?q=" + encodeURIComponent(q) + "&limit=20");
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.exercises || []);
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  }

  function handleExerciseSearch(q: string) {
    setExerciseSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchExercises(q), 300);
  }

  async function finishWorkout() {
    try {
      // Remove any placeholder 0/0 sets before finishing
      const res = await fetch("/api/workouts/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: elapsed }),
      });
      if (res.ok) {
        router.push("/workout/" + id + "/summary");
      }
    } catch (e) { console.error(e); }
  }

  function formatTime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    return m + ":" + String(sec).padStart(2, "0");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading workout...</div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Workout not found</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Top Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between z-50">
        <div>
          <p className="text-white font-bold text-sm">
            {workout.template?.name || "Empty Workout"}
          </p>
          <p className="text-blue-400 font-mono text-lg tabular-nums">{formatTime(elapsed)}</p>
        </div>
        <button
          onClick={() => setShowFinishConfirm(true)}
          className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-5 py-2 font-bold text-sm transition-colors"
        >
          Finish
        </button>
      </div>

      {/* Rest Timer Banner */}
      {restTime !== null && (
        <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">Rest</span>
            <span className="text-white font-mono text-lg font-bold tabular-nums">{formatTime(restTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            {restTime >= restTarget && (
              <span className="text-blue-200 text-xs animate-pulse">Time!</span>
            )}
            <button
              onClick={() => setRestTime(null)}
              className="text-white/80 hover:text-white text-sm font-medium px-2"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Exercise List - Strong Style */}
      <div className="flex-1 overflow-y-auto pb-32">
        {workout.exercises.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">No exercises yet</p>
            <p className="text-zinc-600 text-xs mt-1">Add an exercise to get started</p>
          </div>
        ) : (
          workout.exercises.map((we) => {
            const draft = getDraft(we.exercise.id);
            const realSets = we.sets.filter(s => s.weight > 0 || s.reps > 0);

            return (
              <div key={we.exercise.id} className="border-b border-zinc-800">
                {/* Exercise Name */}
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-blue-400 font-bold text-sm">{we.exercise.name}</h3>
                </div>

                {/* Set Table Header */}
                <div className="px-4 grid grid-cols-12 gap-1 text-xs font-semibold text-zinc-500 py-1">
                  <div className="col-span-2">SET</div>
                  <div className="col-span-3">PREVIOUS</div>
                  <div className="col-span-3 text-center">LBS</div>
                  <div className="col-span-3 text-center">REPS</div>
                  <div className="col-span-1 text-center">✓</div>
                </div>

                {/* Logged Sets */}
                {realSets.map((s, idx) => (
                  <div key={s.id} className="px-4 grid grid-cols-12 gap-1 items-center py-1.5">
                    <div className="col-span-2 text-zinc-400 text-sm font-medium">{idx + 1}</div>
                    <div className="col-span-3 text-zinc-600 text-xs">—</div>
                    <div className="col-span-3 text-center">
                      <span className="text-white text-sm">{s.weight}</span>
                    </div>
                    <div className="col-span-3 text-center">
                      <span className="text-white text-sm">{s.reps}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-green-400 text-sm">✓</span>
                    </div>
                  </div>
                ))}

                {/* Input Row for Next Set */}
                <div className="px-4 grid grid-cols-12 gap-1 items-center py-1.5">
                  <div className="col-span-2 text-zinc-400 text-sm font-medium">{realSets.length + 1}</div>
                  <div className="col-span-3 text-zinc-600 text-xs">—</div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={draft.weight}
                      onChange={(e) => updateDraft(we.exercise.id, "weight", e.target.value)}
                      className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm text-center placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={draft.reps}
                      onChange={(e) => updateDraft(we.exercise.id, "reps", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && logSet(we.exercise.id)}
                      className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm text-center placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => logSet(we.exercise.id)}
                      disabled={!draft.weight || !draft.reps || loggingSet === we.exercise.id}
                      className="w-6 h-6 rounded border-2 border-zinc-600 flex items-center justify-center disabled:opacity-30 hover:border-green-400 hover:bg-green-400/20 transition-colors"
                    >
                      {loggingSet === we.exercise.id ? (
                        <span className="text-zinc-400 text-xs">…</span>
                      ) : null}
                    </button>
                  </div>
                </div>

                {/* Add Set Button */}
                <div className="px-4 py-2">
                  <button
                    onClick={() => logSet(we.exercise.id)}
                    disabled={!draft.weight || !draft.reps}
                    className="w-full text-zinc-500 text-xs py-1 hover:text-zinc-300 transition-colors disabled:opacity-30"
                  >
                    + Add Set
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Add Exercise Button */}
        <div className="px-4 py-4">
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-blue-400 rounded-xl py-3 font-semibold text-sm transition-colors"
          >
            + Add Exercise
          </button>
        </div>
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-zinc-900 flex-1 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <button onClick={() => { setShowAddExercise(false); setExerciseSearch(""); setSearchResults([]); }} className="text-zinc-400 text-sm">Cancel</button>
              <h3 className="text-white font-bold text-sm">Add Exercise</h3>
              <div className="w-12" />
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => handleExerciseSearch(e.target.value)}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searching && <p className="text-zinc-500 text-sm text-center py-4">Searching...</p>}
              {searchResults.map((ex) => {
                const alreadyAdded = workout.exercises.some(we => we.exercise.id === ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => !alreadyAdded && addExerciseToWorkout(ex.id)}
                    disabled={alreadyAdded}
                    className="w-full px-4 py-3 text-left border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors disabled:opacity-40"
                  >
                    <p className="text-white text-sm font-medium">{ex.name}</p>
                    <p className="text-zinc-500 text-xs">{ex.primaryMuscle}{alreadyAdded ? " · Already added" : ""}</p>
                  </button>
                );
              })}
              {exerciseSearch && !searching && searchResults.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-8">No exercises found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-8">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-bold text-lg text-center">Finish Workout?</h3>
            <p className="text-zinc-400 text-sm text-center">
              Duration: {formatTime(elapsed)}
              {workout.exercises.length > 0 && (
                <span> · {workout.exercises.reduce((sum, we) => sum + we.sets.filter(s => s.weight > 0 || s.reps > 0).length, 0)} sets logged</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 bg-zinc-800 text-white rounded-xl py-3 font-semibold text-sm"
              >
                Resume
              </button>
              <button
                onClick={finishWorkout}
                className="flex-1 bg-green-500 text-white rounded-xl py-3 font-bold text-sm"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
