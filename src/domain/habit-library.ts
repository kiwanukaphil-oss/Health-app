import { type GoalId, type Habit, type HabitDefinition } from '@/domain/models';

export const HABIT_LIBRARY: readonly HabitDefinition[] = [
  {
    id: 'start-work-stand',
    title: 'Start-work stand',
    category: 'sitting',
    cueType: 'work_start',
    cueLabel: 'After opening your laptop',
    minimumTargetValue: 1,
    standardTargetValue: 2,
    bonusTargetValue: 5,
    targetUnit: 'minutes',
    instructions: [
      'Stand tall with both feet comfortably planted.',
      'Relax your shoulders and breathe normally.',
      'Walk gently around the room until the timer ends.',
    ],
    seatedAlternative: [
      'Sit upright away from the back of the chair.',
      'March your feet gently and roll both shoulders.',
    ],
  },
  {
    id: 'lunch-walk',
    title: 'Lunch walk',
    category: 'walking',
    cueType: 'after_lunch',
    cueLabel: 'After you finish lunch',
    minimumTargetValue: 2,
    standardTargetValue: 5,
    bonusTargetValue: 10,
    targetUnit: 'minutes',
    instructions: [
      'Choose an indoor or outdoor route that feels easy.',
      'Walk at a pace where you can speak comfortably.',
      'The minimum version counts completely today.',
    ],
    seatedAlternative: [
      'Sit upright and alternate lifting each foot.',
      'Keep the movement gentle and controlled.',
    ],
  },
  {
    id: 'meeting-reset',
    title: 'Meeting reset',
    category: 'mobility',
    cueType: 'meeting_end',
    cueLabel: 'After a meeting ends',
    minimumTargetValue: 1,
    standardTargetValue: 2,
    bonusTargetValue: 3,
    targetUnit: 'minutes',
    instructions: [
      'Roll both shoulders slowly five times.',
      'Turn your upper body gently from side to side.',
      'Finish with a short walk around the room.',
    ],
    seatedAlternative: [
      'Sit upright and roll both shoulders slowly.',
      'Turn gently from side to side without moving your hips.',
    ],
  },
  {
    id: 'close-work-strength',
    title: 'Close-work strength',
    category: 'strength',
    cueType: 'work_end',
    cueLabel: 'After closing your laptop',
    minimumTargetValue: 5,
    standardTargetValue: 10,
    bonusTargetValue: 15,
    targetUnit: 'repetitions',
    instructions: [
      'Stand in front of a stable chair.',
      'Lower toward the chair with control, then stand tall.',
      'Stop if the movement causes pain or dizziness.',
    ],
    seatedAlternative: [
      'Sit upright and straighten one leg at a time.',
      'Lower each foot with control and alternate sides.',
    ],
  },
  {
    id: 'afternoon-breathing',
    title: 'Afternoon breathing reset',
    category: 'recovery',
    cueType: 'afternoon_pause',
    cueLabel: 'Before the afternoon work block',
    minimumTargetValue: 3,
    standardTargetValue: 5,
    bonusTargetValue: 10,
    targetUnit: 'breaths',
    instructions: [
      'Let your shoulders soften.',
      'Breathe in gently through your nose.',
      'Exhale slowly without forcing the breath.',
    ],
  },
] as const;

const priorityHabitIds: Readonly<Record<GoalId, string>> = {
  sit_less: 'start-work-stand',
  move_more: 'lunch-walk',
  mobility: 'meeting-reset',
  strength: 'close-work-strength',
  energy: 'afternoon-breathing',
};

export function findHabitDefinition(habitId: string) {
  return HABIT_LIBRARY.find((habit) => habit.id === habitId);
}

/** Selects up to three distinct habits from stated priorities, then fills any gaps with gentle defaults. */
export function selectStarterHabits(priorities: readonly GoalId[]) {
  const selectedHabitIds = priorities.map((priority) => priorityHabitIds[priority]);
  const defaultHabitIds = ['start-work-stand', 'lunch-walk', 'close-work-strength'];
  const distinctHabitIds = [...new Set([...selectedHabitIds, ...defaultHabitIds])].slice(0, 3);

  return distinctHabitIds.flatMap((habitId) => {
    const habit = findHabitDefinition(habitId);
    return habit ? [habit] : [];
  });
}

export function createHabitFromDefinition(
  definition: HabitDefinition,
  isActive: boolean,
  position: number,
): Habit {
  return { ...definition, isActive, position };
}
