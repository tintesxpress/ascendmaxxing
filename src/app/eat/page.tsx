"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface FoodItem {
  id?: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  servingSizeG: number;
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  imageUrl?: string | null;
  source: "local" | "openfoodfacts";
}

interface PhotoFood {
  name: string;
  estimatedWeightG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: string;
}

interface Meal {
  id: string;
  food: {
    id: string;
    name: string;
    caloriesPerServing: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingSizeG: number;
  };
  mealType: string;
  servings: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface NutritionData {
  meals: Meal[];
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "lunch", label: "Lunch", icon: "☀️" },
  { key: "dinner", label: "Dinner", icon: "🌙" },
  { key: "snack", label: "Snacks", icon: "🍎" },
] as const;

function MacroRing({
  label,
  current,
  target,
  color,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#27272a" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">{Math.round(target - current)}</span>
          <span className="text-zinc-500 text-[9px] leading-none">left</span>
        </div>
      </div>
      <span className="text-zinc-400 text-[10px] mt-1">{label}</span>
      <span className="text-zinc-500 text-[9px]">{Math.round(current)}/{target}{unit}</span>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function displayDate(date: Date): string {
  if (isToday(date)) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate())
    return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function EatPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Food search modal state
  const [showSearch, setShowSearch] = useState(false);
  const [activeMealType, setActiveMealType] = useState<string>("breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [localResults, setLocalResults] = useState<FoodItem[]>([]);
  const [offResults, setOffResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serving input modal
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portionMode, setPortionMode] = useState<"servings" | "grams">("servings");
  const [portionValue, setPortionValue] = useState("1");

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Photo recognition
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoResults, setPhotoResults] = useState<PhotoFood[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const dateParam = isToday(selectedDate) ? "today" : formatDate(selectedDate);
      const res = await fetch(`/api/meals?date=${dateParam}`);
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error("Failed to fetch meals:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  function changeDate(delta: number) {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  function openSearch(mealType: string) {
    setActiveMealType(mealType);
    setShowSearch(true);
    setSearchQuery("");
    setLocalResults([]);
    setOffResults([]);
    setSelectedFood(null);
  }

  function handleSearchInput(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setLocalResults([]);
      setOffResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setLocalResults(data.local || []);
          setOffResults(data.openfoodfacts || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function selectFood(food: FoodItem) {
    setSelectedFood(food);
    setPortionMode("servings");
    setPortionValue("1");
  }

  // Calculate macros based on portion mode
  function getPortionMultiplier(): number {
    if (!selectedFood) return 1;
    const val = parseFloat(portionValue) || 0;
    if (portionMode === "grams") {
      return val / selectedFood.servingSizeG;
    }
    return val;
  }

  async function confirmAddFood() {
    if (!selectedFood) return;
    const multiplier = getPortionMultiplier();
    if (multiplier <= 0) return;

    try {
      let foodId = selectedFood.id;

      if (selectedFood.source === "openfoodfacts" || !foodId) {
        const createRes = await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
            servingSizeG: selectedFood.servingSizeG,
            caloriesPerServing: selectedFood.caloriesPerServing,
            proteinG: selectedFood.proteinG,
            carbsG: selectedFood.carbsG,
            fatG: selectedFood.fatG,
            barcode: selectedFood.barcode,
          }),
        });
        if (!createRes.ok) return;
        const createdFood = await createRes.json();
        foodId = createdFood.id;
      }

      const dateStr = isToday(selectedDate) ? "today" : formatDate(selectedDate);
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, mealType: activeMealType, foodId, servings: multiplier }),
      });

      if (res.ok) {
        setShowSearch(false);
        setSelectedFood(null);
        setSearchQuery("");
        fetchMeals();
      }
    } catch (error) {
      console.error("Failed to add food:", error);
    }
  }

  async function deleteMeal(mealId: string) {
    try {
      await fetch(`/api/meals/${mealId}`, { method: "DELETE" });
      fetchMeals();
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  }

  // ─── Barcode Scanner ───
  async function startScanner() {
    setShowScanner(true);
    setScannerError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try native BarcodeDetector first (Chrome Android)
      if ("BarcodeDetector" in window) {
        // @ts-expect-error BarcodeDetector is not in TS types yet
        const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopScanner();
              await handleBarcode(code);
            }
          } catch { /* scanning frame failed, continue */ }
        }, 200);
      } else {
        // Fallback: manual entry
        setScannerError("Camera barcode detection not supported on this browser. Enter the barcode manually.");
      }
    } catch (err) {
      console.error("Camera error:", err);
      setScannerError("Could not access camera. Please allow camera permissions.");
    }
  }

  function stopScanner() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  }

  async function handleBarcode(code: string) {
    setShowSearch(true);
    setSearching(true);
    setSearchQuery(`Barcode: ${code}`);
    try {
      const res = await fetch(`/api/foods/scan?code=${code}`);
      if (res.ok) {
        const product = await res.json();
        selectFood({ ...product, source: "openfoodfacts" });
      } else {
        setScannerError(`Product not found for barcode ${code}`);
        setShowScanner(true);
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
    } finally {
      setSearching(false);
    }
  }

  // ─── Photo Recognition ───
  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setPhotoResults([]);
    setShowPhotoCapture(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        const res = await fetch("/api/foods/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          setPhotoResults(data.foods || []);
        } else {
          setPhotoResults([]);
        }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Photo analysis error:", error);
      setAnalyzing(false);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  async function logPhotoFood(food: PhotoFood) {
    try {
      const createRes = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: food.name,
          servingSizeG: food.estimatedWeightG,
          caloriesPerServing: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
        }),
      });
      if (!createRes.ok) return;
      const createdFood = await createRes.json();

      const dateStr = isToday(selectedDate) ? "today" : formatDate(selectedDate);
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, mealType: activeMealType, foodId: createdFood.id, servings: 1 }),
      });

      setPhotoResults((prev) => prev.filter((f) => f.name !== food.name));
      fetchMeals();

      if (photoResults.length <= 1) {
        setShowPhotoCapture(false);
      }
    } catch (error) {
      console.error("Failed to log photo food:", error);
    }
  }

  const groupedMeals = {
    breakfast: data?.meals.filter((m) => m.mealType === "breakfast") || [],
    lunch: data?.meals.filter((m) => m.mealType === "lunch") || [],
    dinner: data?.meals.filter((m) => m.mealType === "dinner") || [],
    snack: data?.meals.filter((m) => m.mealType === "snack") || [],
  };

  const remaining = data ? data.targets.calories - data.totals.calories : 0;
  const mult = getPortionMultiplier();

  return (
    <div className="space-y-3 pb-4">
      {/* Date Navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="text-zinc-400 hover:text-white p-2 text-xl">‹</button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">{displayDate(selectedDate)}</h1>
          <a href="/eat/calendar" className="text-blue-400 text-xs hover:text-blue-300">📅</a>
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday(selectedDate)} className="text-zinc-400 hover:text-white p-2 text-xl disabled:opacity-30">›</button>
      </div>

      {/* Calorie Summary */}
      {data && (
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center justify-between text-center mb-3">
            <div>
              <p className="text-zinc-400 text-xs">Goal</p>
              <p className="text-white font-bold text-lg">{data.targets.calories}</p>
            </div>
            <span className="text-zinc-600 text-lg">−</span>
            <div>
              <p className="text-zinc-400 text-xs">Food</p>
              <p className="text-white font-bold text-lg">{Math.round(data.totals.calories)}</p>
            </div>
            <span className="text-zinc-600 text-lg">=</span>
            <div>
              <p className="text-zinc-400 text-xs">Remaining</p>
              <p className={`font-bold text-lg ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {Math.round(remaining)}
              </p>
            </div>
          </div>
          <div className="flex justify-around pt-2 border-t border-zinc-800">
            <MacroRing label="Protein" current={data.totals.protein} target={data.targets.protein} color="#3b82f6" unit="g" />
            <MacroRing label="Carbs" current={data.totals.carbs} target={data.targets.carbs} color="#f59e0b" unit="g" />
            <MacroRing label="Fat" current={data.totals.fat} target={data.targets.fat} color="#ef4444" unit="g" />
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Meal Sections */}
      {!loading && data && MEAL_TYPES.map(({ key, label, icon }) => {
        const meals = groupedMeals[key as keyof typeof groupedMeals];
        const sectionCals = meals.reduce((s, m) => s + m.totalCalories, 0);

        return (
          <div key={key} className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <h2 className="text-white font-semibold text-sm">{label}</h2>
              </div>
              <span className="text-zinc-500 text-xs">{Math.round(sectionCals)} cal</span>
            </div>

            {meals.map((meal) => (
              <div key={meal.id} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{meal.food.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {meal.servings !== 1 ? `${Math.round(meal.servings * meal.food.servingSizeG)}g · ` : ""}
                    {Math.round(meal.totalCalories)} cal · P {Math.round(meal.totalProtein)}g · C {Math.round(meal.totalCarbs)}g · F {Math.round(meal.totalFat)}g
                  </p>
                </div>
                <button onClick={() => deleteMeal(meal.id)} className="text-zinc-600 hover:text-red-400 transition-colors ml-2 text-sm">✕</button>
              </div>
            ))}

            {/* Action Buttons Row */}
            <div className="flex border-t border-zinc-800/30">
              <button onClick={() => openSearch(key)} className="flex-1 px-4 py-3 text-blue-400 text-sm font-medium text-center hover:bg-zinc-800/50 transition-colors">
                + Search
              </button>
              <button
                onClick={() => { setActiveMealType(key); startScanner(); }}
                className="flex-1 px-4 py-3 text-amber-400 text-sm font-medium text-center hover:bg-zinc-800/50 transition-colors border-l border-zinc-800/30"
              >
                ⊟ Scan
              </button>
              <button
                onClick={() => { setActiveMealType(key); photoInputRef.current?.click(); }}
                className="flex-1 px-4 py-3 text-emerald-400 text-sm font-medium text-center hover:bg-zinc-800/50 transition-colors border-l border-zinc-800/30"
              >
                📷 Photo
              </button>
            </div>
          </div>
        );
      })}

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* ─── Food Search Modal ─── */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
            <button onClick={() => { setShowSearch(false); setSelectedFood(null); }} className="text-zinc-400 hover:text-white text-lg">←</button>
            <h2 className="text-white font-semibold flex-1">Add to {MEAL_TYPES.find((m) => m.key === activeMealType)?.label}</h2>
          </div>

          <div className="bg-zinc-900 px-4 py-3">
            <input
              type="text" placeholder="Search foods..."
              value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto bg-zinc-950">
            {searching && <p className="text-zinc-500 text-sm text-center py-6">Searching...</p>}

            {localResults.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-zinc-900/50">
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">My Foods</p>
                </div>
                {localResults.map((food, i) => (
                  <button key={`local-${food.id || i}`} onClick={() => selectFood(food)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-900 transition-colors border-b border-zinc-900">
                    <p className="text-white text-sm">{food.name}</p>
                    <p className="text-zinc-500 text-xs">{food.servingSizeG}g serving · {Math.round(food.caloriesPerServing)} cal · P {Math.round(food.proteinG)}g · C {Math.round(food.carbsG)}g · F {Math.round(food.fatG)}g</p>
                  </button>
                ))}
              </div>
            )}

            {offResults.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-zinc-900/50">
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">OpenFoodFacts</p>
                </div>
                {offResults.map((food, i) => (
                  <button key={`off-${food.barcode || i}`} onClick={() => selectFood(food)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-900 transition-colors border-b border-zinc-900 flex items-center gap-3">
                    {food.imageUrl && <img src={food.imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-zinc-800 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{food.name}</p>
                      {food.brand && <p className="text-zinc-400 text-xs truncate">{food.brand}</p>}
                      <p className="text-zinc-500 text-xs">{food.servingSizeG}g · {Math.round(food.caloriesPerServing)} cal · P {Math.round(food.proteinG)}g · C {Math.round(food.carbsG)}g · F {Math.round(food.fatG)}g</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && !searching && localResults.length === 0 && offResults.length === 0 && (
              <div className="text-center py-10">
                <p className="text-zinc-500 text-sm mb-4">No foods found for &quot;{searchQuery}&quot;</p>
                <button onClick={() => { setShowSearch(false); quickAdd(); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  Create &quot;{searchQuery}&quot; manually
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Serving/Gram Modal ─── */}
      {selectedFood && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
          <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              {selectedFood.imageUrl && <img src={selectedFood.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-zinc-800" />}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{selectedFood.name}</h3>
                {selectedFood.brand && <p className="text-zinc-400 text-sm">{selectedFood.brand}</p>}
                <p className="text-zinc-500 text-xs mt-1">{selectedFood.servingSizeG}g per serving · {Math.round(selectedFood.caloriesPerServing)} cal</p>
              </div>
            </div>

            {/* Portion Mode Toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => { setPortionMode("servings"); setPortionValue("1"); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${portionMode === "servings" ? "bg-blue-500 text-white" : "text-zinc-400"}`}
              >
                Servings
              </button>
              <button
                onClick={() => { setPortionMode("grams"); setPortionValue(String(selectedFood.servingSizeG)); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${portionMode === "grams" ? "bg-blue-500 text-white" : "text-zinc-400"}`}
              >
                Grams
              </button>
            </div>

            {/* Portion Input */}
            <div>
              <label className="text-zinc-400 text-sm block mb-1">
                {portionMode === "servings" ? "Number of servings" : "Weight in grams"}
              </label>
              <input
                type="number" step={portionMode === "servings" ? "0.25" : "1"} min="0"
                value={portionValue} onChange={(e) => setPortionValue(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-lg text-center focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Macro Preview */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-white font-bold text-sm">{Math.round(selectedFood.caloriesPerServing * mult)}</p>
                  <p className="text-zinc-500 text-[10px]">Calories</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold text-sm">{Math.round(selectedFood.proteinG * mult * 10) / 10}g</p>
                  <p className="text-zinc-500 text-[10px]">Protein</p>
                </div>
                <div>
                  <p className="text-amber-400 font-bold text-sm">{Math.round(selectedFood.carbsG * mult * 10) / 10}g</p>
                  <p className="text-zinc-500 text-[10px]">Carbs</p>
                </div>
                <div>
                  <p className="text-red-400 font-bold text-sm">{Math.round(selectedFood.fatG * mult * 10) / 10}g</p>
                  <p className="text-zinc-500 text-[10px]">Fat</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedFood(null)} className="flex-1 bg-zinc-800 text-white rounded-lg py-3 font-semibold">Cancel</button>
              <button onClick={confirmAddFood} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors">Log Food</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Barcode Scanner Modal ─── */}
      {showScanner && (
        <div className="fixed inset-0 bg-black z-[70] flex flex-col">
          <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
            <button onClick={stopScanner} className="text-zinc-400 hover:text-white text-lg">←</button>
            <h2 className="text-white font-semibold">Scan Barcode</h2>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-white/50 rounded-lg" />
            </div>
          </div>

          {scannerError && (
            <div className="bg-zinc-900 p-4 space-y-3">
              <p className="text-amber-400 text-sm text-center">{scannerError}</p>
              <div className="flex gap-2">
                <input
                  type="text" placeholder="Enter barcode manually..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget.value.trim();
                      if (input) { stopScanner(); handleBarcode(input); }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement)?.value?.trim();
                    if (input) { stopScanner(); handleBarcode(input); }
                  }}
                  className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Look up
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Photo Results Modal ─── */}
      {showPhotoCapture && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col">
          <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
            <button onClick={() => { setShowPhotoCapture(false); setPhotoResults([]); }} className="text-zinc-400 hover:text-white text-lg">←</button>
            <h2 className="text-white font-semibold">Photo Analysis</h2>
          </div>

          <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 space-y-3">
            {analyzing && (
              <div className="text-center py-10">
                <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-zinc-400 text-sm">Analyzing your food with AI...</p>
              </div>
            )}

            {!analyzing && photoResults.length === 0 && (
              <div className="text-center py-10">
                <p className="text-zinc-500 text-sm">Could not identify any food in the photo.</p>
                <button onClick={() => setShowPhotoCapture(false)} className="mt-3 text-blue-400 text-sm">Go back</button>
              </div>
            )}

            {photoResults.map((food, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{food.name}</h3>
                    <p className="text-zinc-500 text-xs">~{food.estimatedWeightG}g · Confidence: {food.confidence}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center bg-zinc-800 rounded-lg p-2">
                  <div>
                    <p className="text-white font-bold text-sm">{food.calories}</p>
                    <p className="text-zinc-500 text-[10px]">Cal</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold text-sm">{food.proteinG}g</p>
                    <p className="text-zinc-500 text-[10px]">Protein</p>
                  </div>
                  <div>
                    <p className="text-amber-400 font-bold text-sm">{food.carbsG}g</p>
                    <p className="text-zinc-500 text-[10px]">Carbs</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold text-sm">{food.fatG}g</p>
                    <p className="text-zinc-500 text-[10px]">Fat</p>
                  </div>
                </div>

                <button onClick={() => logPhotoFood(food)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors">
                  Log to {MEAL_TYPES.find((m) => m.key === activeMealType)?.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  function quickAdd() {
    const name = searchQuery || prompt("Food name:") || "";
    if (!name) return;
    const cals = prompt("Calories per serving:", "100");
    const prot = prompt("Protein (g):", "0");
    const carbs = prompt("Carbs (g):", "0");
    const fat = prompt("Fat (g):", "0");
    if (cals !== null) {
      createQuickFood(name, parseFloat(cals || "0"), parseFloat(prot || "0"), parseFloat(carbs || "0"), parseFloat(fat || "0"));
    }
  }

  async function createQuickFood(name: string, calories: number, protein: number, carbs: number, fat: number) {
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, servingSizeG: 100, caloriesPerServing: calories, proteinG: protein, carbsG: carbs, fatG: fat }),
      });
      if (res.ok) {
        const food = await res.json();
        const dateStr = isToday(selectedDate) ? "today" : formatDate(selectedDate);
        await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr, mealType: activeMealType || "snack", foodId: food.id, servings: 1 }),
        });
        fetchMeals();
      }
    } catch (error) {
      console.error("Failed to create food:", error);
    }
  }
}
