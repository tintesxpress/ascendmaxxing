"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  lastPerformed?: string;
}

interface Folder {
  id: string;
  name: string;
  templates: Template[];
}

export default function TrainPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        setFolders(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    } finally {
      setLoading(false);
    }
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
        setShowNewFolderForm(false);
        fetchFolders();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-white">Training</h1>

      {/* New Folder Form */}
      {showNewFolderForm && (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateFolder}
              className="flex-1 bg-white text-black rounded-lg p-3 font-semibold"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewFolderForm(false)}
              className="flex-1 bg-zinc-800 text-white rounded-lg p-3 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNewFolderForm && (
        <button
          onClick={() => setShowNewFolderForm(true)}
          className="w-full bg-white text-black rounded-lg p-3 font-semibold text-sm"
        >
          New Folder
        </button>
      )}

      {/* Folders and Templates */}
      {folders.length === 0 ? (
        <div className="text-center text-zinc-400 py-8">
          <p>No folders yet. Create one to get started.</p>
        </div>
      ) : (
        folders.map((folder) => (
          <div key={folder.id} className="bg-zinc-900 rounded-xl overflow-hidden">
            <button
              onClick={() =>
                setExpandedFolder(expandedFolder === folder.id ? null : folder.id)
              }
              className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors"
            >
              <h2 className="font-semibold text-white">{folder.name}</h2>
              <span className="text-zinc-400">
                {expandedFolder === folder.id ? "−" : "+"}
              </span>
            </button>

            {expandedFolder === folder.id && (
              <div className="border-t border-zinc-800 space-y-2 p-4">
                {folder.templates.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No templates yet</p>
                ) : (
                  folder.templates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/train/${template.id}`}
                      className="block bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition-colors"
                    >
                      <h3 className="text-white font-medium">{template.name}</h3>
                      {template.lastPerformed && (
                        <p className="text-zinc-500 text-xs mt-1">
                          Last: {new Date(template.lastPerformed).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))
                )}

                <button
                  onClick={() => {
                    const templateName = prompt("Template name:");
                    if (templateName) {
                      createTemplate(folder.id, templateName);
                    }
                  }}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg p-3 text-sm font-medium transition-colors"
                >
                  New Template
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  async function createTemplate(folderId: string, name: string) {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, name }),
      });
      if (res.ok) {
        fetchFolders();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  }
}
