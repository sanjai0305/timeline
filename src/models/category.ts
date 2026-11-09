export type CategoryId = 
  | 'study'
  | 'exercise'
  | 'meal'
  | 'travel'
  | 'class'
  | 'practice'
  | 'work'
  | 'rest'
  | 'other';

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  icon: string;
  color: string; // Tailwind color class or hex
  bgGradient?: string;
}

export const CATEGORIES: Record<CategoryId, CategoryDefinition> = {
  study: {
    id: 'study',
    name: 'Study',
    icon: 'BookOpen',
    color: '#818CF8', // Indigo / Purple
  },
  exercise: {
    id: 'exercise',
    name: 'Exercise',
    icon: 'Dumbbell',
    color: '#34D399', // Emerald / Green
  },
  meal: {
    id: 'meal',
    name: 'Meal',
    icon: 'Soup',
    color: '#FBBF24', // Amber / Warm orange
  },
  travel: {
    id: 'travel',
    name: 'Travel',
    icon: 'Bus',
    color: '#60A5FA', // Sky blue
  },
  class: {
    id: 'class',
    name: 'Class',
    icon: 'GraduationCap',
    color: '#A78BFA', // Soft violet
  },
  practice: {
    id: 'practice',
    name: 'Practice',
    icon: 'Laptop',
    color: '#38BDF8', // Light blue
  },
  work: {
    id: 'work',
    name: 'Work',
    icon: 'Briefcase',
    color: '#F472B6', // Pink
  },
  rest: {
    id: 'rest',
    name: 'Rest',
    icon: 'Moon',
    color: '#C084FC', // Purple
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: 'Clock',
    color: '#9CA3AF', // Gray
  },
};

