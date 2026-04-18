"use client";

import { useEffect, useState } from "react";
import { formatDuration, todayDate } from "@/lib/utils";

interface DashboardData {
  today: {
    sleep: number | null;
    nutrition: number | null;
    training: number | null;
    recovery: number | null;
  };
  sevenDays: Array<{
    date: string;
    sleep: number | null;
    nutrition: number | null;
    training: number | null;
    recovery: number | null;
  }>;
  streak: number;
  bodyweight: {
    current: number | null;
    previous: number | null;
  };
}

function getColorClass(score: number | null): { circle: string; bg: string } {
  if (score === null) return { circle: "bg-zinc-600", bg: "bg-zinc-900" };
  if (score >= 80) return { circle: "bg-green-500", bg: "bg-green-950" };
  if (score >= 50) return { circle: "bg-yellow-500", bg: "bg-yellow-950" };
  return { circle: "bg-red-500", bg: "bg-red-950" };
}

function TrafficLightCard({
  label,
  subtitle,
  score,
}: {
  label: string;
  subtitle: string;
  score: number | null;
}) {
  const colors = getColorClass(score);
  return (
    <div className={`${colors.bg} rounded-xl p-4 flex flex-col items-center justify-center gap-2`}>
      <div className={`${colors.circle} w-12 h-12 rounded-full`} />
      <h3 className="text-zinc-300 text-sm font-medium">{label}</h3>
      <p className="text-zinc-500 text-xs">{subtitle}</p>
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
            <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-400 text-center py-8">Failed to load dashboard</div>;
  }

  const trendArrow = data.bodyweight.previous
    ? data.bodyweight.current! > data.bodyweight.previous
      ? "↑"
      : data.bodyweight.current! < data.bodyweight.previous
        ? "↓"
        : "→"
    : "→";

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">ASCENDING</h1>
        <p className="text-zinc-500 text-sm">{new Date().toLocaleDateString()}</p>
      </div>

      {/* Traffic Light Cards */}
      <div className="grid grid-cols-2 gap-4">
        <TrafficLightCard label="Sleep" subtitle={data.today.sleep ? `${data.today.sleep}h` : "No data"} score={data.today.sleep ? data.today.sleep * 10 : null} />
        <TrafficLightCard
          label="Nutrition"
          subtitle={data.today.nutrition ? `${Math.round(data.today.nutrition)}%` : "No data"}
          score={data.today.nutrition}
        />
        <TrafficLightCard
          label="Training"
          subtitle={data.today.training ? `${formatDuration(data.today.training)}` : "No data"}
          score={data.today.training ? 100 : null}
        />
        <TrafficLightCard
          label="Recovery"
          subtitle={data.today.recovery ? `${Math.round(data.today.recovery)}%` : "No data"}
          score={data.today.recovery}
        />
      </div>

      {/* 7-Day Grid */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Last 7 Days</h2>
        <div className="flex gap-2 justify-between">
          {data.sevenDays.map((day, idx) => (
            <div key={idx} className="flex flex-col gap-1 items-center flex-1">
              <p className="text-xs text-zinc-500">
                {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
              </p>
              <div className="flex flex-col gap-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${getColorClass(day.sleep).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${getColorClass(day.nutrition).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${getColorClass(day.training).circle}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${getColorClass(day.recovery).circle}`}
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
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Body Weight</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{data.bodyweight.current?.toFixed(1) || "—"}</span>
          <span className="text-zinc-500">lbs</span>
          <span className="text-lg text-zinc-400">{trendArrow}</span>
        </div>
      </div>
    </div>
  );
}
