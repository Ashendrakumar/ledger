import type { EntryType } from '@/types';
import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Feather>['name'];

export const DEFAULT_CATEGORIES: Record<EntryType, string[]> = {
  expense: ['Rent', 'Food', 'Transport', 'Bills', 'Shopping', 'Health'],
  income: ['Salary', 'Freelance', 'Interest', 'Other'],
  saving: ['Emergency fund', 'Investment', 'Goals'],
};

const ICONS: Record<string, IconName> = {
  Rent: 'home',
  Food: 'coffee',
  Transport: 'truck',
  Bills: 'zap',
  Shopping: 'shopping-bag',
  Health: 'heart',
  Salary: 'briefcase',
  Freelance: 'edit-3',
  Interest: 'percent',
  'Emergency fund': 'shield',
  Investment: 'trending-up',
  Goals: 'flag',
};
export const iconFor = (category: string, type: EntryType): IconName =>
  ICONS[category] ?? (type === 'income' ? 'arrow-down-left' : type === 'saving' ? 'archive' : 'tag');
