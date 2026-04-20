"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SetData {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  completed?: boolean;
}

interface PreviousSet {
  weight: number;
  reps: number;
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

const DEFAULT_REST = 120; // 2 minutes like Strong

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [workoutName, setWorkoutName] = useState("");
  const [editingName, setEditingName] = useState(false);

  // Per-exercise draft sets
  const [draftSets, setDraftSets] = useState<Record<string, { weight: string; reps: string }>>({});
  const [loggingSet, setLoggingSet] = useState<string | null>(null);

  // Previous workout data per exercise
  const [previousData, setPreviousData] = useState<Record<string, PreviousSet[]>>({});

  // Rest timer
  const [restTime, setRestTime] = useState<number | null>(null);
  const [restTarget] = useState(DEFAULT_REST);

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Create exercise form
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExMuscle, setNewExMuscle] = useState("chest");
  const [newExEquipment, setNewExEquipment] = useState("barbell");
  const [creating, setCreating] = useState(false);

  // Finish confirmation
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      setRestTime(t => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [restTime !== null]);

  const fetchPreviousData = useCallback(async (exercises: WorkoutExercise[]) => {
    const prev: Record<string, PreviousSet[]> = {};
    for (const we of exercises) {
      try {
        const res = await fetch("/api/exercises/" + we.exercise.id + "/history");
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            // Get the most recent workout's sets for this exercise
            prev[we.exercise.id] = data.history[0].sets.map((s: any) => ({
              weight: s.weight,
              reps: s.reps,
            }));
          }
        }
      } catch (e) { /* ignore */ }
    }
    setPreviousData(prev);
  }, []);

  async function fetchWorkout() {
    try {
      const res = await fetch("/api/workouts/" + id);
      if (res.ok) {
        const data = await res.json();
        setWorkout(data);
        setWorkoutName(data.template?.name || "Empty Workout");
        fetchPreviousData(data.exercises || []);
      }
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
        setRestTime(restTarget);
        fetchWorkout();
      }
    } catch (e) { console.error(e); }
    setLoggingSet(null);
  }

  async function addExerciseToWorkout(exerciseId: string) {
    setShowAddExercise(false);
    setExerciseSearch("");
    setSearchResults([]);
    try {
      await fetch("/api/workouts/" + id + "/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, weight: 0, reps: 0 }),
      });
      fetchWorkout();
    } catch (e) { console.error(e); }
  }

  async function createExercise() {
    if (!newExName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExName.trim(),
          primaryMuscle: newExMuscle,
          equipment: newExEquipment,
          category: "strength",
        }),
      });
      if (res.ok) {
        const exercise = await res.json();
        setShowCreateExercise(false);
        setNewExName("");
        // Add to workout immediately
        addExerciseToWorkout(exercise.id);
      }
    } catch (e) { console.error(e); }
    setCreating(false);
  }

  function handleSearch(q: string) {
    setExerciseSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
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
    }, 300);
  }

  async function finishWorkout() {
    try {
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

  function formatRest(s: number): string {
    if (s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ":" + String(sec).padStart(2, "0");
  }

  const muscleGroups = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quadriceps", "hamstrings", "glutes", "calves", "abs", "cardio"];
  const equipmentTypes = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "band", "kettlebell", "other"];

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
        <div className="flex-1">
          {editingName ? (
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              autoFocus
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm font-bold w-full focus:outline-none focus:border-blue-500"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-left">
              <p className="text-white font-bold text-sm">{workoutName}</p>
            </button>
          )}
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
      {restTime !== null && restTime > 0 && (
        <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">Rest Timer</span>
            <span className="text-white font-mono text-xl font-bold tabular-nums">{formatRest(restTime)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRestTime(Math.max(0, (restTime || 0) - 15))}
              className="text-white/70 text-xs font-medium bg-blue-700 rounded px-2 py-1"
            >−15s</button>
            <button
              onClick={() => setRestTime((restTime || 0) + 15)}
              className="text-white/70 text-xs font-medium bg-blue-700 rounded px-2 py-1"
            >+15s</button>
            <button
              onClick={() => setRestTime(null)}
              className="text-white/80 text-xs font-semibold px-2"
            >Skip</button>
          </div>
        </div>
      )}

      {/* Exercise List */}
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
            const prevSets = previousData[we.exercise.id] || [];

            return (
              <div key={we.exercise.id} className="border-b border-zinc-800 py-3">
                {/* Exercise Name */}
                <div className="px-4 mb-2">
                  <Link href={"/exercises/" + we.exercise.id} className="text-blue-400 font-bold text-sm hover:underline">
                    {we.exercise.name}
                  </Link>
                </div>

                {/* Set Table Header */}
                <div className="px-4 grid grid-cols-12 gap-1 text-[10px] font-semibold text-zinc-500 py-1 uppercase">
                  <div className="col-span-1">Set</div>
                  <div className="col-span-3 text-center">Previous</div>
                  <div className="col-span-3 text-center">lbs</div>
                  <div className="col-span-3 text-center">Reps</div>
                  <div className="col-span-2 text-center">✓</div>
                </div>

                {/* Logged Sets */}
                {realSets.map((s, idx) => {
                  const prev = prevSets[idx];
                  return (
                    <div key={s.id} className="px-4 grid grid-cols-12 gap-1 items-center py-1.5">
                      <div className="col-span-1 text-zinc-400 text-sm font-medium">{idx + 1}</div>
                      <div className="col-span-3 text-center text-zinc-500 text-xs">
                        {prev ? prev.weight + " lb × " + prev.reps : "—"}
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="text-white text-sm">{s.weight}</span>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="text-white text-sm">{s.reps}</span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-400 text-xs">✓</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Input Row for Next Set */}
                <div className="px-4 grid grid-cols-12 gap-1 items-center py-1.5">
                  <div className="col-span-1 text-zinc-400 text-sm font-medium">{realSets.length + 1}</div>
                  <div className="col-span-3 text-center text-zinc-500 text-xs">
                    {prevSets[realSets.length] ? prevSets[realSets.length].weight + " lb × " + prevSets[realSets.length].reps : "—"}
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={prevSets[realSets.length] ? String(prevSets[realSets.length].weight) : "0"}
                      value={draft.weight}
                      onChange={(e) => updateDraft(we.exercise.id, "weight", e.target.value)}
                      className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm text-center placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={prevSets[realSets.length] ? String(prevSets[realSets.length].reps) : "0"}
                      value={draft.reps}
                      onChange={(e) => updateDraft(we.exercise.id, "reps", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && logSet(we.exercise.id)}
                      className="w-full bg-zinc-800 rounded px-2 py-1.5 text-white text-sm text-center placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => logSet(we.exercise.id)}
                      disabled={!draft.weight || !draft.reps || loggingSet === we.exercise.id}
                      className="w-6 h-6 rounded border-2 border-zinc-600 flex items-center justify-center disabled:opacity-30 hover:border-green-400 hover:bg-green-400/20 transition-colors"
                    >
                      {loggingSet === we.exercise.id ? (
                        <span className="text-zinc-400 text-xs">...</span>
                      ) : null}
                    </button>
                  </div>
                </div>

                {/* Add Set */}
                <div className="px-4 mt-1">
                  <button
                    onClick={() => logSet(we.exercise.id)}
                    disabled={!draft.weight || !draft.reps}
                    className="text-blue-400 text-xs font-medium disabled:opacity-30"
                  >
                    + Add Set
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Add Exercises Button */}
        <div className="px-4 py-4">
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-blue-400 rounded-xl py-3 font-semibold text-sm transition-colors"
          >
            Add Exercises
          </button>
        </div>
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && !showCreateExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-zinc-900 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <button onClick={() => { setShowAddExercise(false); setExerciseSearch(""); setSearchResults([]); }} className="text-blue-400 text-sm font-medium">Cancel</button>
              <h3 className="text-white font-bold text-sm">Add Exercise</h3>
              <button onClick={() => setShowCreateExercise(true)} className="text-blue-400 text-sm font-medium">Create</button>
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
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

      {/* Create Exercise Modal */}
      {showCreateExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-zinc-900 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <button onClick={() => setShowCreateExercise(false)} className="text-blue-400 text-sm font-medium">Back</button>
              <h3 className="text-white font-bold text-sm">Create Exercise</h3>
              <div className="w-10" />
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1">Exercise Name</label>
                <input
                  type="text"
                  placeholder="e.g. Incline Dumbbell Press"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1">Primary Muscle</label>
                <select
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  {muscleGroups.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1">Equipment</label>
                <select
                  value={newExEquipment}
                  onChange={(e) => setNewExEquipment(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  {equipmentTypes.map(e => (
                    <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={createExercise}
                disabled={!newExName.trim() || creating}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold text-sm transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create & Add to Workout"}
              </button>
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
