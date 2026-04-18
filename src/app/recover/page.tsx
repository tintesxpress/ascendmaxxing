"use client";

import { useState, useEffect } from "react";

interface SleepLog {
  id: string;
  date: string;
  durationHours: number;
  quality: number;
}

interface BodyWeightLog {
  id: string;
  date: string;
  weight: number;
}

interface RecoveryData {
  sleep: {
    today: SleepLog | null;
    logs: SleepLog[];
  };
  bodyweight: {
    today: BodyWeightLog | null;
    logs: BodyWeightLog[];
  };
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (r: number) => void;
}) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-zinc-700"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function SimpleLineChart({ data }: { data: BodyWeightLog[] }) {
  if (data.length < 2) {
    return <p className="text-zinc-500 text-sm text-center">Not enough data</p>;
  }

  const weights = data.map((d) => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 1;
  const chartHeight = 100;
  const chartWidth = 200;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.weight - minWeight) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={chartWidth} height={chartHeight} className="border border-zinc-700 rounded">
        <path d={pathD} stroke="white" strokeWidth="2" fill="none" />
      </svg>
      <div className="flex gap-2 text-xs text-zinc-500">
        <span>{minWeight.toFixed(1)} lbs</span>
        <span>{maxWeight.toFixed(1)} lbs</span>
      </div>
    </div>
  );
}

export default function RecoverPage() {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Sleep form state
  const [showSleepForm, setShowSleepForm] = useState(false);
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepQuality, setSleepQuality] = useState(3);

  // Body weight form state
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weight, setWeight] = useState("");

  useEffect(() => {
    fetchRecovery();
  }, []);

  async function fetchRecovery() {
    try {
      const res = await fetch("/api/recovery");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch recovery data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logSleep() {
    if (!bedtime || !wakeTime) return;

    try {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedtime,
          wakeTime,
          quality: sleepQuality,
        }),
      });
      if (res.ok) {
        setBedtime("23:00");
        setWakeTime("07:00");
        setSleepQuality(3);
        setShowSleepForm(false);
        fetchRecovery();
      }
    } catch (error) {
      console.error("Failed to log sleep:", error);
    }
  }

  async function logWeight() {
    if (!weight) return;

    try {
      const res = await fetch("/api/bodyweight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: parseFloat(weight) }),
      });
      if (res.ok) {
        setWeight("");
        setShowWeightForm(false);
        fetchRecovery();
      }
    } catch (error) {
      console.error("Failed to log weight:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-400">Failed to load recovery data</div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-white">Recovery</h1>

      {/* Sleep Card */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Sleep</h2>

        {!showSleepForm && !data.sleep.today ? (
          <button
            onClick={() => setShowSleepForm(true)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 font-semibold transition-colors"
          >
            Log Sleep
          </button>
        ) : null}

        {showSleepForm && (
          <div className="space-y-3">
            <div>
              <label className="text-zinc-400 text-sm">Bedtime</label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600 mt-1"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Wake Time</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600 mt-1"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Quality</label>
              <StarRating rating={sleepQuality} onRate={setSleepQuality} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={logSleep}
                className="flex-1 bg-white text-black rounded-lg p-3 font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => setShowSleepForm(false)}
                className="flex-1 bg-zinc-800 text-white rounded-lg p-3 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.sleep.today && (
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-sm">Today's Sleep</p>
            <p className="text-white text-lg font-semibold mt-1">
              {data.sleep.today.durationHours.toFixed(1)} hours
            </p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-lg ${i < data.sleep.today!.quality ? "text-yellow-400" : "text-zinc-700"}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last 7 nights */}
        {data.sleep.logs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Last 7 Nights</h3>
            <div className="space-y-2">
              {data.sleep.logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-2">
                  <span className="text-zinc-400 text-sm">
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{log.durationHours.toFixed(1)}h</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${i < log.quality ? "text-yellow-400" : "text-zinc-700"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body Weight Card */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Body Weight</h2>

        {!showWeightForm && (
          <button
            onClick={() => setShowWeightForm(true)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg p-3 font-semibold transition-colors"
          >
            Log Weight
          </button>
        )}

        {showWeightForm && (
          <div className="space-y-3">
            <div>
              <label className="text-zinc-400 text-sm">Weight (lbs)</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 mt-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={logWeight}
                className="flex-1 bg-white text-black rounded-lg p-3 font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => setShowWeightForm(false)}
                className="flex-1 bg-zinc-800 text-white rounded-lg p-3 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.bodyweight.today && (
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 text-sm">Today's Weight</p>
            <p className="text-white text-2xl font-bold mt-1">
              {data.bodyweight.today.weight.toFixed(1)} lbs
            </p>
          </div>
        )}

        {/* Chart */}
        {data.bodyweight.logs.length > 0 && (
          <SimpleLineChart data={data.bodyweight.logs} />
        )}
      </div>
    </div>
  );
}
