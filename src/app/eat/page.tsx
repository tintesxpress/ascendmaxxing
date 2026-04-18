"use client";

import { useState, useEffect } from "react";

interface Meal {
  id: string;
  food: {
    name: string;
  };
  mealType: string;
  servings: number;
  totalCalories: number;
  totalProtein: number;
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

const MealTypeLabel: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function ProgressBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold">
          {Math.round(current)} / {target}
        </span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-white h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function EatPage() {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFood, setShowAddFood] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  async function fetchMeals() {
    try {
      const res = await fetch("/api/meals?date=today");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch meals:", error);
    } finally {
      setLoading(false);
    }
  }

  async function searchFoods() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (error) {
      console.error("Failed to search foods:", error);
    } finally {
      setSearching(false);
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

  const groupedMeals = {
    breakfast: data?.meals.filter((m) => m.mealType === "breakfast") || [],
    lunch: data?.meals.filter((m) => m.mealType === "lunch") || [],
    dinner: data?.meals.filter((m) => m.mealType === "dinner") || [],
    snack: data?.meals.filter((m) => m.mealType === "snack") || [],
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-400">Failed to load nutrition data</div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-white">Nutrition</h1>

      {/* Progress Bars */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
        <ProgressBar
          label="Calories"
          current={data.totals.calories}
          target={data.targets.calories}
        />
        <ProgressBar
          label="Protein (g)"
          current={data.totals.protein}
          target={data.targets.protein}
        />
        <ProgressBar
          label="Carbs (g)"
          current={data.totals.carbs}
          target={data.targets.carbs}
        />
        <ProgressBar
          label="Fat (g)"
          current={data.totals.fat}
          target={data.targets.fat}
        />
      </div>

      {/* Meals by Type */}
      {Object.entries(groupedMeals).map(([type, meals]) => (
        <div key={type}>
          {meals.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-400">
                {MealTypeLabel[type as keyof typeof MealTypeLabel]}
              </h2>
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="bg-zinc-900 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{meal.food.name}</p>
                    <p className="text-zinc-500 text-xs">
                      {meal.totalCalories.toFixed(0)} cal, {meal.totalProtein.toFixed(0)}g protein
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="text-zinc-500 hover:text-red-500 transition-colors text-lg ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add Food Button/Modal */}
      {!showAddFood ? (
        <button
          onClick={() => setShowAddFood(true)}
          className="fixed bottom-28 right-4 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center font-bold text-2xl shadow-lg hover:bg-zinc-100 transition-colors"
        >
          +
        </button>
      ) : (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-zinc-900 rounded-t-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg">Add Food</h2>

            <input
              type="text"
              placeholder="Search foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onInput={searchFoods}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />

            {searching && <p className="text-zinc-400 text-sm">Searching...</p>}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      const servings = prompt("Servings:", "1");
                      if (servings && !isNaN(parseFloat(servings))) {
                        addFood(food.id, parseFloat(servings));
                      }
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left transition-colors text-white"
                  >
                    <div className="font-medium">{food.name}</div>
                    <div className="text-zinc-400 text-xs">
                      {food.caloriesPerServing.toFixed(0)} cal
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && !searching && searchResults.length === 0 && (
              <button
                onClick={() => {
                  const name = searchQuery;
                  const cals = prompt("Calories per serving:", "100");
                  const prot = prompt("Protein (g):", "10");
                  const carbs = prompt("Carbs (g):", "20");
                  const fat = prompt("Fat (g):", "5");
                  if (cals && prot && carbs && fat) {
                    createFood(
                      name,
                      parseFloat(cals),
                      parseFloat(prot),
                      parseFloat(carbs),
                      parseFloat(fat)
                    );
                  }
                }}
                className="w-full bg-zinc-700 hover:bg-zinc-600 rounded-lg p-3 text-white font-semibold transition-colors"
              >
                Create New Food
              </button>
            )}

            <button
              onClick={() => {
                setShowAddFood(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="w-full bg-zinc-800 text-white rounded-lg p-3 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  async function addFood(foodId: string, servings: number) {
    const mealType = prompt("Meal type (breakfast/lunch/dinner/snack):", "lunch");
    if (!mealType) return;

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId, mealType, servings }),
      });
      if (res.ok) {
        setShowAddFood(false);
        setSearchQuery("");
        setSearchResults([]);
        fetchMeals();
      }
    } catch (error) {
      console.error("Failed to add meal:", error);
    }
  }

  async function createFood(
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) {
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          servingSizeG: 100,
          caloriesPerServing: calories,
          proteinG: protein,
          carbsG: carbs,
          fatG: fat,
        }),
      });
      if (res.ok) {
        const food = await res.json();
        const mealType = prompt("Meal type (breakfast/lunch/dinner/snack):", "lunch");
        if (mealType) {
          addFood(food.id, 1);
        }
      }
    } catch (error) {
      console.error("Failed to create food:", error);
    }
  }
}
