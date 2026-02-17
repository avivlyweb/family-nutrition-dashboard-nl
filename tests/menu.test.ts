import { describe, expect, it } from "vitest";
import { generateWeekPlan } from "@/lib/menu/generate-week-plan";

describe("week plan", () => {
  it("contains 7 days and 4 meals per day", () => {
    const week = generateWeekPlan();
    expect(week.days).toHaveLength(7);
    for (const day of week.days) {
      expect(day.meals).toHaveLength(4);
    }
  });

  it("keeps dinner plate portions complete", () => {
    const week = generateWeekPlan();
    expect(week.complianceChecks.dinnerPlateRatioValid).toBe(true);
  });

  it("never includes pork references", () => {
    const week = generateWeekPlan();
    expect(week.complianceChecks.noPorkProducts).toBe(true);
  });

  it("uses higher dinner carbs on training days", () => {
    const week = generateWeekPlan();
    const trainingDay = week.days.find((d) => d.workoutType !== "rest");
    const restDay = week.days.find((d) => d.workoutType === "rest");

    expect(trainingDay).toBeDefined();
    expect(restDay).toBeDefined();

    const trainingDinner = trainingDay!.meals.find((m) => m.mealType === "avondeten");
    const restDinner = restDay!.meals.find((m) => m.mealType === "avondeten");

    expect(trainingDinner?.portions.koolhydraten).toContain("1-1.25 vuist");
    expect(restDinner?.portions.koolhydraten).toBe("1 vuist");
  });
});
