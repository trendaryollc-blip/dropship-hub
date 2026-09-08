import { describe, it, expect } from "vitest";
import type {
  Mission,
  MissionType,
  XPReward,
  LevelConfig,
} from "@/types/automation";

describe("Missions Page - Data Types", () => {
  it("mission has required fields", () => {
    const mission: Mission = {
      id: "m-1",
      title: "Research 5 trending products",
      description: "Find and analyze 5 products trending on social media",
      type: "daily",
      category: "research",
      xpReward: 50,
      progress: 3,
      total: 5,
      completed: false,
      streak: 5,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(mission.completed).toBe(false);
    expect(mission.progress).toBeLessThanOrEqual(mission.total);
    expect(mission.xpReward).toBeGreaterThan(0);
  });

  it("mission type values", () => {
    const types: MissionType[] = ["daily", "weekly", "achievement", "bonus"];
    expect(types).toHaveLength(4);
  });

  it("XP reward has required fields", () => {
    const reward: XPReward = {
      id: "xr-1",
      amount: 100,
      source: "mission_completion",
      description: "Completed daily mission",
      timestamp: new Date().toISOString(),
    };
    expect(reward.amount).toBeGreaterThan(0);
  });

  it("level config has required fields", () => {
    const level: LevelConfig = {
      level: 5,
      title: "Product Hunter",
      xpRequired: 2500,
      xpCurrent: 1800,
      xpToNext: 700,
      rewards: ["Custom badge", "Advanced analytics"],
    };
    expect(level.xpCurrent).toBeLessThan(level.xpRequired);
    expect(level.rewards.length).toBeGreaterThan(0);
  });
});

describe("Missions Page - Business Logic", () => {
  it("calculates mission progress percentage", () => {
    const progress = 3;
    const total = 5;
    const pct = (progress / total) * 100;
    expect(pct).toBe(60);
  });

  it("can filter incomplete missions", () => {
    const missions: Mission[] = [
      { id: "1", completed: false } as Mission,
      { id: "2", completed: true } as Mission,
      { id: "3", completed: false } as Mission,
    ];
    const incomplete = missions.filter((m) => !m.completed);
    expect(incomplete).toHaveLength(2);
  });

  it("can filter by mission type", () => {
    const missions: Mission[] = [
      { id: "1", type: "daily" } as Mission,
      { id: "2", type: "weekly" } as Mission,
      { id: "3", type: "daily" } as Mission,
    ];
    const daily = missions.filter((m) => m.type === "daily");
    expect(daily).toHaveLength(2);
  });

  it("calculates total XP earned", () => {
    const rewards: XPReward[] = [
      { id: "1", amount: 50 } as XPReward,
      { id: "2", amount: 100 } as XPReward,
      { id: "3", amount: 75 } as XPReward,
    ];
    const total = rewards.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBe(225);
  });

  it("can calculate level from XP", () => {
    const levels = [
      { level: 1, xpRequired: 0 },
      { level: 2, xpRequired: 100 },
      { level: 3, xpRequired: 300 },
      { level: 4, xpRequired: 600 },
      { level: 5, xpRequired: 1000 },
    ];
    const xp = 450;
    const currentLevel = levels.filter((l) => xp >= l.xpRequired).pop();
    expect(currentLevel?.level).toBe(3);
  });

  it("can sort missions by XP reward", () => {
    const missions: Mission[] = [
      { id: "1", xpReward: 25 } as Mission,
      { id: "2", xpReward: 100 } as Mission,
      { id: "3", xpReward: 50 } as Mission,
    ];
    const sorted = [...missions].sort((a, b) => b.xpReward - a.xpReward);
    expect(sorted[0].id).toBe("2");
  });

  it("can count completed vs pending", () => {
    const missions: Mission[] = [
      { id: "1", completed: true } as Mission,
      { id: "2", completed: false } as Mission,
      { id: "3", completed: true } as Mission,
    ];
    const completed = missions.filter((m) => m.completed).length;
    const pending = missions.filter((m) => !m.completed).length;
    expect(completed).toBe(2);
    expect(pending).toBe(1);
  });
});
