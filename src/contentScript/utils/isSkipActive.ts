import type { SkipInterval } from '../../types/SkipRules';

export function isSkipActive(rule: SkipInterval): boolean {
  return rule.isActive !== false;
}
