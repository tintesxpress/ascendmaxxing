"use client";

import { useEffect, useState } from "react";

type Status = "green" | "yellow" | "red";

interface DashboardData {
  sleepStatus: Status;
  nutritionStatus: Status;
  trainingStatus: Status;
  recoveryStatus: Status;
  history: Array<{
    date: string;
    sleep: Status;
    nutrition: Status;
    training: Status;
    recovery: Status;
  }>;
  streak: number;
  latestWeight: { weight: number; date: string } | null;
  weightTrend: "up" | "down" | "stable" | null;
}

function statusColor(status: Status | null): { circle: string; bg: string } {
  switch (status) {
    case "green":
      return { circle: "bg-green-500", bg: "bg-green-950" };
    case "yellow":
      return { circle: "bg-yellow-500", bg: "bg-yellow-950" };
    case "red":
      return { circle: "bg-red-500", bg: "bg-red-950" };
    default:
      return { circle: "bg-zinc-600", bg: "bg-zinc-900" };
  }
}

function TrafficLightCard({
  label,
  status,
}: {
  label: string;
  status: Status;
}) {
  const colors = statusColor(status);
  return (
    <div
      className={`${colors.bg} rounded-xl p-4 flex flex-col items-center justify-center gap-2`}
    >
      <div className={`${colors.circle} w-12 h-12 rounded-full`} />
      <h3 className="text-zinc-300 text-sm font-medium">{label}</h3>
      <p className="text-zinc-500 text-xs capitalize">{status}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-zinc-900 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-zinc-400 text-center py-8">
        Failed to load dashboard
      </div>
    );
  }

  const trendArrow =
    data.weightTrend === "up"
      ? "\u2191"
      : data.weightTrend === "down"
        ? "\u2193"
        : "\u2192";

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">ASCENDING</h1>
        <p className="text-zinc-500 text-sm">
          {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Traffic Light Cards */}
      <div className="grid grid-cols-2 gap-4">
        <TrafficLightCard label="Sleep" status={data.sleepStatus} />
        <TrafficLightCard label="Nutrition" status={data.nutritionStatus} />
        <TrafficLightCard label="Training" status={data.trainingStatus} />
        <TrafficLightCard label="Recovery" status={data.recoveryStatus} />
      </div>

      {/* 7-Day Grid */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">
          Last 7 Days
        </h2>
        <div className="flex gap-2 justify-between">
          {data.history.map((day, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 items-center flex-1"
            >
              <p className="text-xs text-zinc-500">
                {new Date(day.date + "T12:00:00")
                  .toLocaleDateString("en-US", { weekday: "short" })
                  .slice(0, 1)}
              </p>
              <div className="flex flex-col gap-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${statusColor(day.sleep).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${statusColor(day.nutrition).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${statusColor(day.training).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${statusColor(day.recovery).circle}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      <div className="bg-green-950 rounded-xl p-4 text-center">
        <p className="text-green-400 text-2xl font-bold">{data.streak}</p>
        <p className="text-green-300 text-sm">days all green</p>
      </div>

      {/* Body Weight */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">
          Body Weight
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            {data.latestWeight?.weight.toFixed(1) || "\u2014"}
          </span>
          <span className="text-zinc-500">lbs</span>
          <span className="text-lg text-zinc-400">{trendArrow}</span>
        </div>
      </div>
    </div>
  );
}
