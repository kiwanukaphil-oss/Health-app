import { describe, expect, it } from '@jest/globals';

import { selectStarterHabits } from '@/domain/habit-library';

describe('starter habit selection', () => {
  it('maps priorities in order and removes duplicates', () => {
    const habits = selectStarterHabits(['strength', 'sit_less', 'strength']);
    expect(habits.map((habit) => habit.id)).toEqual([
      'close-work-strength',
      'start-work-stand',
      'lunch-walk',
    ]);
  });

  it('fills a short selection with gentle defaults', () => {
    const habits = selectStarterHabits(['energy']);
    expect(habits.map((habit) => habit.id)).toEqual([
      'afternoon-breathing',
      'start-work-stand',
      'lunch-walk',
    ]);
  });

  it('never creates more than three starter habits', () => {
    const habits = selectStarterHabits(['sit_less', 'move_more', 'mobility', 'strength', 'energy']);
    expect(habits).toHaveLength(3);
  });
});
