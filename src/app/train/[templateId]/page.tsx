"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

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

export default function TemplateDetail({ params }: { params: Promise<{ templateId: string }> }) {
  const router = useRouter();
  const { templateId } = use(params);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        setNewName(data.name);
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateTemplateName() {
    if (!newName.trim() || !template) return;
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setTemplate({ ...template, name: newName });
        setEditingName(false);
      }
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  }

  async function searchExercises() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/exercises?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (error) {
      console.error("Failed to search exercises:", error);
    } finally {
      setSearching(false);
    }
  }

  async function addExercise(exerciseId: string) {
    try {
      const res = await fetch(`/api/templates/${templateId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, targetSets: 3 }),
      });
      if (res.ok) {
        fetchTemplate();
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    }
  }

  async function removeExercise(templateExerciseId: string) {
    try {
      const res = await fetch(
        `/api/templates/${templateId}/exercises/${templateExerciseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchTemplate();
      }
    } catch (error) {
      console.error("Failed to remove exercise:", error);
    }
  }

  async function startWorkout() {
    if (!template) return;
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        const workout = await res.json();
        router.push(`/workout/${workout.id}`);
      }
    } catch (error) {
      console.error("Failed to start workout:", error);
    }
  }

  if (loading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  if (!template) {
    return <div className="text-zinc-400">Template not found</div>;
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Template Name */}
      <div>
        {editingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
              autoFocus
            />
            <button
              onClick={updateTemplateName}
              className="bg-white text-black rounded-lg p-3 font-semibold min-w-fit"
            >
              Save
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="bg-zinc-800 text-white rounded-lg p-3 font-semibold min-w-fit"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1
            onClick={() => setEditingName(true)}
            className="text-2xl font-bold text-white cursor-pointer hover:text-zinc-300 transition-colors"
          >
            {template.name}
          </h1>
        )}
      </div>

      {/* Exercises List */}
      <div className="space-y-2">
        {template.exercises.length === 0 ? (
          <div className="text-zinc-500 text-center py-6">No exercises yet</div>
        ) : (
          template.exercises.map((te) => (
            <div key={te.id} className="bg-zinc-900 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white font-medium">{te.exercise.name}</h3>
                <p className="text-zinc-500 text-sm">{te.targetSets} sets</p>
              </div>
              <button
                onClick={() => removeExercise(te.id)}
                className="text-zinc-500 hover:text-red-500 transition-colors text-lg"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Exercise Button/Search */}
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 font-semibold transition-colors"
        >
          Add Exercise
        </button>
      ) : (
        <div className="bg-zinc-900 rounded-lg p-4 space-y-3">
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onInput={searchExercises}
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />

          {searching && <p className="text-zinc-400 text-sm">Searching...</p>}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => addExercise(exercise.id)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left transition-colors text-white"
                >
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-zinc-400 text-xs">{exercise.primaryMuscle}</div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && !searching && searchResults.length === 0 && (
            <p className="text-zinc-500 text-sm">No exercises found</p>
          )}

          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="w-full bg-zinc-800 text-white rounded-lg p-3 text-sm font-medium"
          >
            Close
          </button>
        </div>
      )}

      {/* Start Workout Button */}
      {template.exercises.length > 0 && (
        <button
          onClick={startWorkout}
          className="w-full bg-white text-black rounded-lg p-4 font-bold text-lg sticky bottom-4"
        >
          Start Workout
        </button>
      )}
    </div>
  );
}
