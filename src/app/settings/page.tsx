"use client";

import { useState, useEffect } from "react";

interface Settings {
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbTarget: number;
  dailyFatTarget: number;
  sleepGoalHours: number;
  bodyweightLbs?: number;
  heightCm?: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState<Settings>({
    dailyCalorieTarget: 2800,
    dailyProteinTarget: 180,
    dailyCarbTarget: 350,
    dailyFatTarget: 70,
    sleepGoalHours: 8,
    bodyweightLbs: undefined,
    heightCm: undefined,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormData(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setMessage("Settings saved successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    try {
      const res = await fetch("/api/settings?export=true");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ascending-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  }

  const handleInputChange = (field: keyof Settings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "sleepGoalHours" || field === "bodyweightLbs" || field === "heightCm"
        ? value ? parseFloat(value) : undefined
        : parseInt(value) || 0,
    }));
  };

  if (loading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes("success") ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"
        }`}>
          {message}
        </div>
      )}

      {/* Nutrition Settings */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Nutrition</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Daily Calorie Target</label>
          <input
            type="number"
            inputMode="numeric"
            value={formData.dailyCalorieTarget}
            onChange={(e) => handleInputChange("dailyCalorieTarget", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Daily Protein Target (g)</label>
          <input
            type="number"
            inputMode="numeric"
            value={formData.dailyProteinTarget}
            onChange={(e) => handleInputChange("dailyProteinTarget", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Daily Carb Target (g)</label>
          <input
            type="number"
            inputMode="numeric"
            value={formData.dailyCarbTarget}
            onChange={(e) => handleInputChange("dailyCarbTarget", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Daily Fat Target (g)</label>
          <input
            type="number"
            inputMode="numeric"
            value={formData.dailyFatTarget}
            onChange={(e) => handleInputChange("dailyFatTarget", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Sleep Settings */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Sleep</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Sleep Goal (hours)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={formData.sleepGoalHours}
            onChange={(e) => handleInputChange("sleepGoalHours", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Body Settings */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Body</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Current Body Weight (lbs)</label>
          <input
            type="number"
            inputMode="decimal"
            value={formData.bodyweightLbs || ""}
            onChange={(e) => handleInputChange("bodyweightLbs", e.target.value)}
            placeholder="Optional"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">Height (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            value={formData.heightCm || ""}
            onChange={(e) => handleInputChange("heightCm", e.target.value)}
            placeholder="Optional"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-white text-black rounded-lg p-4 font-bold text-lg hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        <button
          onClick={exportData}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 font-semibold transition-colors"
        >
          Export Data
        </button>
      </div>
    </div>
  );
}
