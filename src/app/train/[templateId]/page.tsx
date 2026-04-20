"use client";

import { useState, useEffect, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
}

interface TemplateExercise {
  id: string;
  exercise: Exercise;
  targetSets: number;
  position: number;
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

interface SearchResult {
  id: string;
  name: string;
  primaryMuscle: string;
}

export default function TemplateDetail({ params }: { params: Promise<{ templateId: string }> }) {
  const router = useRouter();
  const { templateId } = use(params);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => { fetchTemplate(); }, [templateId]);

  async function fetchTemplate() {
    try {
      const res = await fetch("/api/templates/" + templateId);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        setNewName(data.name);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function updateName() {
    if (!newName.trim() || !template) return;
    try {
      const res = await fetch("/api/templates/" + templateId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setTemplate({ ...template, name: newName });
        setEditingName(false);
      }
    } catch (e) { console.error(e); }
  }

  async function addExercise(exerciseId: string) {
    try {
      const res = await fetch("/api/templates/" + templateId + "/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, targetSets: 3 }),
      });
      if (res.ok) {
        setShowAddExercise(false);
        setExerciseSearch("");
        setSearchResults([]);
        fetchTemplate();
      }
    } catch (e) { console.error(e); }
  }

  async function removeExercise(templateExerciseId: string) {
    try {
      const res = await fetch(
        "/api/templates/" + templateId + "/exercises/" + templateExerciseId,
        { method: "DELETE" }
      );
      if (res.ok) fetchTemplate();
    } catch (e) { console.error(e); }
  }

  async function updateTargetSets(templateExerciseId: string, currentSets: number, delta: number) {
    const newSets = Math.max(1, currentSets + delta);
    if (!template) return;
    // Optimistic update
    setTemplate({
      ...template,
      exercises: template.exercises.map(te =>
        te.id === templateExerciseId ? { ...te, targetSets: newSets } : te
      ),
    });
    try {
      await fetch("/api/templates/" + templateId + "/exercises", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercises: template.exercises.map((te, idx) => ({
            id: te.id,
            position: idx,
            targetSets: te.id === templateExerciseId ? newSets : te.targetSets,
          })),
        }),
      });
    } catch (e) { console.error(e); }
  }

  async function moveExercise(index: number, direction: "up" | "down") {
    if (!template) return;
    const newExercises = [...template.exercises];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newExercises.length) return;
    [newExercises[index], newExercises[swapIdx]] = [newExercises[swapIdx], newExercises[index]];
    setTemplate({ ...template, exercises: newExercises });
    try {
      await fetch("/api/templates/" + templateId + "/exercises", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercises: newExercises.map((te, idx) => ({ id: te.id, position: idx })),
        }),
      });
    } catch (e) { console.error(e); }
  }

  async function deleteTemplate() {
    try {
      const res = await fetch("/api/templates/" + templateId, { method: "DELETE" });
      if (res.ok) router.push("/train");
    } catch (e) { console.error(e); }
  }

  async function startWorkout() {
    setStarting(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        const workout = await res.json();
        router.push("/workout/" + workout.id);
      }
    } catch (e) { console.error(e); }
    setStarting(false);
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

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Template not found</p>
        <Link href="/train" className="text-blue-400 text-sm mt-2 block">Back to Training</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/train" className="text-blue-400 text-sm font-medium">← Back</Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-400 text-sm font-medium"
        >
          Delete
        </button>
      </div>

      {/* Template Name */}
      <div>
        {editingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateName()}
              autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
            />
            <button onClick={updateName} className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">Save</button>
            <button onClick={() => { setEditingName(false); setNewName(template.name); }} className="text-zinc-400 px-2">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditingName(true)} className="text-left w-full">
            <h1 className="text-2xl font-bold text-white">{template.name}</h1>
            <p className="text-zinc-600 text-xs mt-0.5">Tap to edit name</p>
          </button>
        )}
      </div>

      {/* Exercise List */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Exercises ({template.exercises.length})
        </h2>

        {template.exercises.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">No exercises yet</p>
            <p className="text-zinc-600 text-xs mt-1">Add exercises to build your routine</p>
          </div>
        ) : (
          <div className="space-y-2">
            {template.exercises.map((te, idx) => (
              <div key={te.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Reorder Arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveExercise(idx, "up")}
                      disabled={idx === 0}
                      className="text-zinc-500 text-xs disabled:opacity-20 hover:text-white transition-colors leading-none"
                    >▲</button>
                    <button
                      onClick={() => moveExercise(idx, "down")}
                      disabled={idx === template.exercises.length - 1}
                      className="text-zinc-500 text-xs disabled:opacity-20 hover:text-white transition-colors leading-none"
                    >▼</button>
                  </div>

                  {/* Exercise Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{te.exercise.name}</p>
                    <p className="text-zinc-500 text-xs">{te.exercise.primaryMuscle}</p>
                  </div>

                  {/* Target Sets */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTargetSets(te.id, te.targetSets, -1)}
                      className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-sm"
                    >−</button>
                    <div className="text-center min-w-[2.5rem]">
                      <p className="text-white font-bold text-sm">{te.targetSets}</p>
                      <p className="text-zinc-600 text-[10px] leading-none">sets</p>
                    </div>
                    <button
                      onClick={() => updateTargetSets(te.id, te.targetSets, 1)}
                      className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-sm"
                    >+</button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeExercise(te.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-lg ml-1"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Exercise Button */}
      <button
        onClick={() => setShowAddExercise(true)}
        className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-blue-400 rounded-xl py-3 font-semibold text-sm transition-colors"
      >
        + Add Exercise
      </button>

      {/* Start Workout - Fixed Bottom */}
      {template.exercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-8">
          <button
            onClick={startWorkout}
            disabled={starting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-4 font-bold text-base transition-colors disabled:opacity-50"
          >
            {starting ? "Starting..." : "Start Workout"}
          </button>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-zinc-900 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <button onClick={() => { setShowAddExercise(false); setExerciseSearch(""); setSearchResults([]); }} className="text-zinc-400 text-sm">Cancel</button>
              <h3 className="text-white font-bold text-sm">Add Exercise</h3>
              <div className="w-12" />
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
                const alreadyAdded = template.exercises.some(te => te.exercise.id === ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => !alreadyAdded && addExercise(ex.id)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-8">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-bold text-lg text-center">Delete Routine?</h3>
            <p className="text-zinc-400 text-sm text-center">
              &quot;{template.name}&quot; will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-zinc-800 text-white rounded-xl py-3 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteTemplate}
                className="flex-1 bg-red-500 text-white rounded-xl py-3 font-bold text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
