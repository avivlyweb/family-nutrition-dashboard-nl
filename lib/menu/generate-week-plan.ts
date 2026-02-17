import products from "@/data/products.nl.json";
import workouts from "@/data/workouts.week.json";
import type {
  ComplianceChecks,
  DayPlan,
  MealOption,
  ProductItem,
  ShoppingItem,
  Store,
  WeekPlan,
  WorkoutType,
} from "@/lib/types";

interface WorkoutSeed {
  day: string;
  workoutType: WorkoutType;
  focus: string;
}

const productList = products as ProductItem[];
const workoutList = workouts as WorkoutSeed[];

function chooseProduct(idA: string, idB: string): string {
  const a = productList.find((p) => p.id === idA);
  return a ? idA : idB;
}

function breakfast(dayIndex: number): MealOption {
  const fruit = dayIndex % 2 === 0 ? chooseProduct("jumbo-appel", "lidl-appel") : chooseProduct("jumbo-banaan", "lidl-banaan");
  return {
    mealType: "ontbijt",
    items: [chooseProduct("jumbo-magere-kwark-500g", "lidl-magere-kwark-500g"), fruit],
    portions: {
      zuivel: "250 g",
      fruit: "1 stuk",
    },
    swapOptions: [chooseProduct("lidl-magere-kwark-500g", "jumbo-magere-kwark-500g")],
  };
}

function lunch(trainingDay: boolean): MealOption {
  return {
    mealType: "lunch",
    items: [
      chooseProduct("jumbo-volkoren-brood", "lidl-volkoren-brood"),
      chooseProduct("jumbo-kipfilet-beleg", "lidl-kipfilet-beleg"),
      chooseProduct("jumbo-30plus-kaas", "lidl-30plus-kaas"),
      chooseProduct("jumbo-komkommer", "lidl-komkommer"),
      chooseProduct("jumbo-appel", "lidl-appel"),
    ],
    portions: {
      brood: "4 volkoren boterhammen",
      beleg: "dun besmeerd",
      fruit: trainingDay ? "1 stuk (aanbevolen)" : "1 stuk (optioneel)",
    },
    swapOptions: [chooseProduct("lidl-volkoren-brood", "jumbo-volkoren-brood")],
    notes: trainingDay
      ? "Trainingsdag: fruit niet overslaan voor energie en herstel."
      : "Rustdag: fruit blijft optioneel volgens basisregel.",
  };
}

function snack(dayIndex: number, trainingDay: boolean): MealOption {
  const cycle = dayIndex % 3;
  if (cycle === 0) {
    return {
      mealType: "snack",
      items: [chooseProduct("jumbo-banaan", "lidl-banaan")],
      portions: { snack: "1 stuk fruit" },
      swapOptions: [chooseProduct("jumbo-appel", "lidl-appel")],
    };
  }

  if (cycle === 1) {
    return {
      mealType: "snack",
      items: [chooseProduct("jumbo-ongezouten-noten", "lidl-ongezouten-noten")],
      portions: { snack: "25 g ongezouten noten" },
      swapOptions: [chooseProduct("lidl-ongezouten-noten", "jumbo-ongezouten-noten")],
    };
  }

  return {
    mealType: "snack",
    items: [chooseProduct("jumbo-magere-kwark-500g", "lidl-magere-kwark-500g")],
    portions: { snack: trainingDay ? "200 g yoghurt/kwark" : "150-200 g yoghurt/kwark" },
    swapOptions: [chooseProduct("lidl-magere-kwark-500g", "jumbo-magere-kwark-500g")],
  };
}

function dinner(dayIndex: number, trainingDay: boolean): MealOption {
  const proteinRotation = [
    chooseProduct("jumbo-kipfilet-avond", "lidl-kipfilet-avond"),
    chooseProduct("jumbo-zalmfilet", "lidl-zalmfilet"),
    chooseProduct("jumbo-tofu", "lidl-tofu"),
  ];
  const carbRotation = [
    chooseProduct("jumbo-aardappelen", "lidl-aardappelen"),
    chooseProduct("jumbo-zilvervliesrijst", "lidl-zilvervliesrijst"),
    chooseProduct("jumbo-volkoren-pasta", "lidl-volkoren-pasta"),
  ];
  const vegetableRotation = [
    chooseProduct("jumbo-broccoli", "lidl-broccoli"),
    chooseProduct("jumbo-wokgroente", "lidl-wokgroente"),
  ];

  return {
    mealType: "avondeten",
    items: [
      proteinRotation[dayIndex % proteinRotation.length],
      carbRotation[dayIndex % carbRotation.length],
      vegetableRotation[dayIndex % vegetableRotation.length],
      chooseProduct("jumbo-olijfolie", "lidl-olijfolie"),
    ],
    portions: {
      groenten: "1/2 bord",
      eiwit: "100-125 g",
      koolhydraten: trainingDay ? "1-1.25 vuist" : "1 vuist",
      vet: "1 theelepel olie of klein beetje jus",
      regel: "Geen tweede bord",
    },
    swapOptions: [
      chooseProduct("lidl-kipfilet-avond", "jumbo-kipfilet-avond"),
      chooseProduct("lidl-zilvervliesrijst", "jumbo-zilvervliesrijst"),
    ],
  };
}

function calcKcalBand(type: WorkoutType): string {
  if (type === "rest") {
    return "2200-2350 kcal";
  }
  if (type === "run") {
    return "2350-2500 kcal";
  }
  return "2400-2550 kcal";
}

function buildShoppingList(days: DayPlan[]): Record<Store, ShoppingItem[]> {
  const counts = new Map<string, number>();

  for (const day of days) {
    for (const meal of day.meals) {
      for (const productId of meal.items) {
        counts.set(productId, (counts.get(productId) ?? 0) + 1);
      }
    }
  }

  const shopping: Record<Store, ShoppingItem[]> = { jumbo: [], lidl: [] };

  for (const [productId, quantity] of counts.entries()) {
    const product = productList.find((p) => p.id === productId);
    if (!product) {
      continue;
    }
    shopping[product.store].push({
      productId,
      name: product.name,
      quantity,
      unit: "x/week",
      notes: product.notes,
    });
  }

  return shopping;
}

function getCompliance(days: DayPlan[]): ComplianceChecks {
  const lunchRule = days.every((day) =>
    day.meals.some((meal) => meal.mealType === "lunch" && meal.portions.brood.includes("4 volkoren")),
  );

  const dinnerRule = days.every((day) => {
    const dinnerMeal = day.meals.find((meal) => meal.mealType === "avondeten");
    if (!dinnerMeal) {
      return false;
    }
    return (
      Boolean(dinnerMeal.portions.groenten) &&
      Boolean(dinnerMeal.portions.eiwit) &&
      Boolean(dinnerMeal.portions.koolhydraten) &&
      Boolean(dinnerMeal.portions.vet)
    );
  });

  const noPork = days.every((day) =>
    day.meals
      .flatMap((meal) => meal.items)
      .map((id) => productList.find((p) => p.id === id)?.name ?? "")
      .every((name) => !name.toLowerCase().includes("varken") && !name.toLowerCase().includes("ham")),
  );

  const snackKinds = days
    .map((day) => day.meals.find((meal) => meal.mealType === "snack")?.portions.snack ?? "")
    .filter(Boolean);
  const rotatingSnackRule = new Set(snackKinds).size >= 3;

  return {
    lunchFourWholegrainSlices: lunchRule,
    dinnerPlateRatioValid: dinnerRule,
    noPorkProducts: noPork,
    rotatingSnackRule,
  };
}

export function generateWeekPlan(): WeekPlan {
  const days: DayPlan[] = workoutList.map((workout, index) => {
    const trainingDay = workout.workoutType !== "rest";
    return {
      day: workout.day,
      workoutType: workout.workoutType,
      kcalBand: calcKcalBand(workout.workoutType),
      meals: [breakfast(index), lunch(trainingDay), snack(index, trainingDay), dinner(index, trainingDay)],
    };
  });

  return {
    days,
    shoppingListByStore: buildShoppingList(days),
    complianceChecks: getCompliance(days),
  };
}
