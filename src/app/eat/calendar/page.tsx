"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: "green" | "yellow" | "red";
}

interface CalendarData {
  days: DayData[];
  targets: { calories: number; protein: number; carbs: number; fat: number };
  streak: number;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function NutritionCalendar() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    fetchCalendar();
  }, [month, year]);

  async function fetchCalendar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutrition/calendar?month=${month}&year=${year}`);
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setLoading(false);
    }
  }

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setSelectedDay(null);
  }

  function getDaysInMonth(m: number, y: number): number {
    return new Date(y, m, 0).getDate();
  }

  function getFirstDayOfWeek(m: number, y: number): number {
    return new Date(y, m - 1, 1).getDay();
  }

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfWeek(month, year);
  const dayDataMap: Record<string, DayData> = {};
  data?.days.forEach((d) => { dayDataMap[d.date] = d; });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Stats for the month
  const loggedDays = data?.days.length || 0;
  const greenDays = data?.days.filter((d) => d.status === "green").length || 0;
  const avgCalories = loggedDays > 0
    ? Math.round((data?.days.reduce((s, d) => s + d.calories, 0) || 0) / loggedDays)
    : 0;
  const avgProtein = loggedDays > 0
    ? Math.round((data?.days.reduce((s, d) => s + d.protein, 0) || 0) / loggedDays)
    : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-lg">←</button>
        <h1 className="text-lg font-bold text-white">Nutrition Calendar</h1>
        <div className="w-6" />
      </div>

      {/* Streak */}
      {data && data.streak > 0 && (
        <div className="bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-white font-bold">{data.streak} day streak</p>
            <p className="text-emerald-400 text-xs">Keep logging to maintain your streak!</p>
          </div>
        </div>
      )}

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-3">
        <button onClick={() => changeMonth(-1)} className="text-zinc-400 hover:text-white p-1 text-lg">‹</button>
        <h2 className="text-white font-semibold">{MONTH_NAMES[month - 1]} {year}</h2>
        <button onClick={() => changeMonth(1)} className="text-zinc-400 hover:text-white p-1 text-lg">›</button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-zinc-900 rounded-xl p-3">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-zinc-500 text-xs font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayData = dayDataMap[dateKey];
            const isToday = dateKey === todayKey;
            const isFuture = new Date(dateKey) > today;

            let bgColor = "bg-zinc-800";
            let dotColor = "";
            if (dayData) {
              bgColor = dayData.status === "green" ? "bg-emerald-900/60" : dayData.status === "yellow" ? "bg-amber-900/40" : "bg-red-900/40";
              dotColor = dayData.status === "green" ? "bg-emerald-400" : dayData.status === "yellow" ? "bg-amber-400" : "bg-red-400";
            }

            return (
              <button
                key={dayNum}
                onClick={() => {
                  if (dayData) setSelectedDay(dayData);
                  else {
                    // Navigate to that day's food diary
                    router.push(`/eat?date=${dateKey}`);
                  }
                }}
                disabled={isFuture}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors
                  ${bgColor} ${isToday ? "ring-2 ring-blue-400" : ""} ${isFuture ? "opacity-30" : "hover:opacity-80"}`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-blue-400" : "text-white"}`}>{dayNum}</span>
                {dayData && (
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-500 text-[10px]">On target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-zinc-500 text-[10px]">Off target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-zinc-500 text-[10px]">Way off</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-zinc-800" />
            <span className="text-zinc-500 text-[10px]">No data</span>
          </div>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            <button
              onClick={() => router.push(`/eat?date=${selectedDay.date}`)}
              className="text-blue-400 text-xs hover:text-blue-300"
            >
              View diary →
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-zinc-800 rounded-lg p-2">
              <p className="text-white font-bold text-sm">{Math.round(selectedDay.calories)}</p>
              <p className="text-zinc-500 text-[10px]">Calories</p>
              <p className="text-zinc-600 text-[9px]">/{data?.targets.calories}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-2">
              <p className="text-blue-400 font-bold text-sm">{Math.round(selectedDay.protein)}g</p>
              <p className="text-zinc-500 text-[10px]">Protein</p>
              <p className="text-zinc-600 text-[9px]">/{data?.targets.protein}g</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-2">
              <p className="text-amber-400 font-bold text-sm">{Math.round(selectedDay.carbs)}g</p>
              <p className="text-zinc-500 text-[10px]">Carbs</p>
              <p className="text-zinc-600 text-[9px]">/{data?.targets.carbs}g</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-2">
              <p className="text-red-400 font-bold text-sm">{Math.round(selectedDay.fat)}g</p>
              <p className="text-zinc-500 text-[10px]">Fat</p>
              <p className="text-zinc-600 text-[9px]">/{data?.targets.fat}g</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {data && loggedDays > 0 && (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          <h3 className="text-white font-semibold text-sm">Monthly Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 text-xs">Days Logged</p>
              <p className="text-white font-bold">{loggedDays}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 text-xs">Days On Target</p>
              <p className="text-emerald-400 font-bold">{greenDays} <span className="text-zinc-500 text-xs font-normal">({loggedDays > 0 ? Math.round((greenDays / loggedDays) * 100) : 0}%)</span></p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 text-xs">Avg Calories</p>
              <p className="text-white font-bold">{avgCalories} <span className="text-zinc-500 text-xs font-normal">/{data.targets.calories}</span></p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 text-xs">Avg Protein</p>
              <p className="text-blue-400 font-bold">{avgProtein}g <span className="text-zinc-500 text-xs font-normal">/{data.targets.protein}g</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
