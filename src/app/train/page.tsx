"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TemplateExercise {
  id: string;
  exercise: { name: string };
  targetSets: number;
}

interface Template {
  id: string;
  name: string;
  exercises?: TemplateExercise[];
}

interface Folder {
  id: string;
  name: string;
  templates: Template[];
}

interface RecentWorkout {
  id: string;
  date: string;
  durationSeconds?: number;
  template?: { name: string };
  sets: { exerciseId: string; exercise?: { name: string } }[];
}

export default function TrainPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([fetchFolders(), fetchRecentWorkouts()]).finally(() => setLoading(false));
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) setFolders(await res.json());
    } catch (e) { console.error(e); }
  }

  async function fetchRecentWorkouts() {
    try {
      const res = await fetch("/api/workouts?limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentWorkouts(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  }

  async function startEmptyWorkout() {
    setStarting(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const workout = await res.json();
        router.push("/workout/" + workout.id);
      }
    } catch (e) { console.error(e); }
    setStarting(false);
  }

  async function startFromTemplate(templateId: string) {
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

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolder(false);
        fetchFolders();
      }
    } catch (e) { console.error(e); }
  }

  async function createTemplate(folderId: string, name: string) {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, name }),
      });
      if (res.ok) fetchFolders();
    } catch (e) { console.error(e); }
  }

  function formatDuration(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + " min";
  }

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <div className="h-12 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-32 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Training</h1>
      </div>

      {/* Quick Start */}
      <button
        onClick={startEmptyWorkout}
        disabled={starting}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 font-bold text-base transition-colors disabled:opacity-50"
      >
        {starting ? "Starting..." : "Start Empty Workout"}
      </button>

      {/* My Routines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">My Routines</h2>
          <button
            onClick={() => setShowNewFolder(true)}
            className="text-blue-400 text-sm font-medium"
          >
            + Folder
          </button>
        </div>

        {/* New Folder Form */}
        {showNewFolder && (
          <div className="bg-zinc-900 rounded-xl p-3 mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleCreateFolder} className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="text-zinc-400 px-2">✕</button>
          </div>
        )}

        {folders.length === 0 && !showNewFolder ? (
          <div className="bg-zinc-900 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">No routines yet</p>
            <p className="text-zinc-600 text-xs mt-1">Create a folder to organize your workout templates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder) => (
              <div key={folder.id} className="bg-zinc-900 rounded-xl overflow-hidden">
                {/* Folder Header */}
                <button
                  onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                  className="w-full px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">{expandedFolder === folder.id ? "▾" : "▸"}</span>
                    <span className="text-white font-semibold text-sm">{folder.name}</span>
                    <span className="text-zinc-600 text-xs">({folder.templates.length})</span>
                  </div>
                </button>

                {/* Expanded Templates */}
                {expandedFolder === folder.id && (
                  <div className="border-t border-zinc-800">
                    {folder.templates.map((template) => (
                      <div key={template.id} className="border-b border-zinc-800 last:border-b-0">
                        <div className="px-4 py-3 flex items-center justify-between">
                          <Link href={"/train/" + template.id} className="flex-1">
                            <p className="text-white font-medium text-sm">{template.name}</p>
                            {template.exercises && template.exercises.length > 0 && (
                              <p className="text-zinc-500 text-xs mt-0.5">
                                {template.exercises.map(e => e.exercise.name).join(", ")}
                              </p>
                            )}
                          </Link>
                          <button
                            onClick={() => startFromTemplate(template.id)}
                            disabled={starting}
                            className="bg-blue-500/20 text-blue-400 rounded-lg px-3 py-1.5 text-xs font-semibold ml-3 hover:bg-blue-500/30 transition-colors"
                          >
                            Start
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const name = prompt("Template name:");
                        if (name) createTemplate(folder.id, name);
                      }}
                      className="w-full px-4 py-3 text-blue-400 text-sm font-medium text-left hover:bg-zinc-800/50 transition-colors"
                    >
                      + Add Routine
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Workouts</h2>
          <div className="space-y-2">
            {recentWorkouts.map((w) => {
              const uniqueExercises = new Set(w.sets?.map(s => s.exercise?.name || s.exerciseId) || []);
              return (
                <Link
                  key={w.id}
                  href={"/workout/" + w.id + "/summary"}
                  className="block bg-zinc-900 rounded-xl p-3 hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {w.template?.name || "Empty Workout"}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {w.durationSeconds ? " · " + formatDuration(w.durationSeconds) : ""}
                        {uniqueExercises.size > 0 ? " · " + uniqueExercises.size + " exercises" : ""}
                      </p>
                    </div>
                    <span className="text-zinc-600 text-sm">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
