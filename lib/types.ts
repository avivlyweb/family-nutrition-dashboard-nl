export type Store = "jumbo" | "lidl";

export type Category =
  | "zuivel"
  | "fruit"
  | "brood"
  | "beleg"
  | "rauwkost"
  | "noten"
  | "eiwit"
  | "koolhydraten"
  | "groente"
  | "olie";

export interface ProductItem {
  id: string;
  store: Store;
  name: string;
  category: Category;
  size: string;
  unit: string;
  notes: string;
  sourceUrl: string;
  fallbackIds: string[];
}

export type WorkoutType = "hiit" | "run" | "rest";

export interface MealPortions {
  [key: string]: string;
}

export interface MealOption {
  mealType: "ontbijt" | "lunch" | "snack" | "avondeten";
  items: string[];
  portions: MealPortions;
  swapOptions: string[];
  notes?: string;
}

export interface DayPlan {
  day: string;
  workoutType: WorkoutType;
  kcalBand: string;
  meals: MealOption[];
}

export interface ComplianceChecks {
  lunchFourWholegrainSlices: boolean;
  dinnerPlateRatioValid: boolean;
  noPorkProducts: boolean;
  rotatingSnackRule: boolean;
}

export interface ShoppingItem {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface WeekPlan {
  days: DayPlan[];
  shoppingListByStore: Record<Store, ShoppingItem[]>;
  complianceChecks: ComplianceChecks;
}
