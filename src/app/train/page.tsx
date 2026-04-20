"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TemplateExercise {
  id: string;
  exercise: { name: string };
  targetSets: number;
}

interface TemplateWorkout {
  date: string;
}

interface Template {
  id: string;
  name: string;
  exercises?: TemplateExercise[];
  workouts?: TemplateWorkout[];
}

interface Folder {
  id: string;
  name: string;
  templates: Template[];
}

export default function TrainPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [showNewRoutine, setShowNewRoutine] = useState<string | null>(null);
  const [newRoutineName, setNewRoutineName] = useState("");

  useEffect(() => {
    fetchFolders().finally(() => setLoading(false));
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) setFolders(await res.json());
    } catch (e) { console.error(e); }
  }

  async function startEmptyWorkout() {
    setStarting("empty");
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
    setStarting(null);
  }

  async function startFromTemplate(templateId: string) {
    setStarting(templateId);
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
    setStarting(null);
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

  async function handleCreateRoutine(folderId: string) {
    if (!newRoutineName.trim()) return;
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, name: newRoutineName }),
      });
      if (res.ok) {
        setNewRoutineName("");
        setShowNewRoutine(null);
        fetchFolders();
      }
    } catch (e) { console.error(e); }
  }

  function formatLastPerformed(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return diffDays + " days ago";
    if (diffDays < 30) return Math.floor(diffDays / 7) + "w ago";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <div className="h-12 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-40 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="h-40 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Start Workout</h1>
      </div>

      {/* Quick Start */}
      <div>
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Quick Start</p>
        <button
          onClick={startEmptyWorkout}
          disabled={starting === "empty"}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-3.5 font-bold text-sm transition-colors disabled:opacity-50"
        >
          {starting === "empty" ? "Starting..." : "Start an Empty Workout"}
        </button>
      </div>

      {/* Routines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Routines</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="text-blue-400 text-xs font-medium"
            >
              + Folder
            </button>
          </div>
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
            <button onClick={handleCreateFolder} className="bg-blue-500 text-white rounded-lg px-4 py-2 text-xs font-semibold">Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="text-zinc-400 px-2 text-sm">✕</button>
          </div>
        )}

        {folders.length === 0 && !showNewFolder ? (
          <div className="bg-zinc-900 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">No routines yet</p>
            <p className="text-zinc-600 text-xs mt-1">Create a folder to organize your workout templates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {folders.map((folder) => (
              <div key={folder.id}>
                {/* Folder Header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm">{folder.name}</h3>
                  <button
                    onClick={() => { setShowNewRoutine(folder.id); setNewRoutineName(""); }}
                    className="text-blue-400 text-xs font-medium"
                  >
                    + Routine
                  </button>
                </div>

                {/* New Routine Form */}
                {showNewRoutine === folder.id && (
                  <div className="bg-zinc-900 rounded-xl p-3 mb-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Routine name"
                      value={newRoutineName}
                      onChange={(e) => setNewRoutineName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateRoutine(folder.id)}
                      autoFocus
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={() => handleCreateRoutine(folder.id)} className="bg-blue-500 text-white rounded-lg px-4 py-2 text-xs font-semibold">Create</button>
                    <button onClick={() => setShowNewRoutine(null)} className="text-zinc-400 px-2 text-sm">✕</button>
                  </div>
                )}

                {/* Routine Cards Grid */}
                {folder.templates.length === 0 ? (
                  <div className="bg-zinc-900/50 rounded-xl p-4 text-center border border-dashed border-zinc-800">
                    <p className="text-zinc-600 text-xs">No routines in this folder</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {folder.templates.map((template) => {
                      const exerciseNames = template.exercises?.map(e => e.exercise.name) || [];
                      const lastWorkout = template.workouts && template.workouts.length > 0
                        ? template.workouts[0]
                        : null;

                      return (
                        <div key={template.id} className="bg-zinc-900 rounded-xl overflow-hidden flex flex-col">
                          {/* Card Content - tap to edit */}
                          <Link
                            href={"/train/" + template.id}
                            className="p-3 flex-1"
                          >
                            <p className="text-white font-semibold text-sm truncate">{template.name}</p>
                            <p className="text-zinc-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                              {exerciseNames.length > 0
                                ? exerciseNames.join(", ")
                                : "No exercises"}
                            </p>
                            {lastWorkout && (
                              <p className="text-zinc-600 text-[10px] mt-2">
                                {formatLastPerformed(lastWorkout.date)}
                              </p>
                            )}
                          </Link>

                          {/* Start Button */}
                          <button
                            onClick={() => startFromTemplate(template.id)}
                            disabled={starting === template.id || !template.exercises || template.exercises.length === 0}
                            className="border-t border-zinc-800 py-2 text-blue-400 text-xs font-semibold hover:bg-zinc-800/50 transition-colors disabled:opacity-30 disabled:text-zinc-600"
                          >
                            {starting === template.id ? "Starting..." : "Start"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
