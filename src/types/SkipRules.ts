export interface SkipInterval {
  start: number;
  end: number;
  // Intervals saved before activity controls were added are active by default.
  isActive?: boolean;
}

export type SkipRules = Record<string, { title: string; intervals: SkipInterval[] }>;
