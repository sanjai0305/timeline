import React from 'react';
import {
  BookOpen,
  Dumbbell,
  Soup,
  Utensils,
  Bus,
  GraduationCap,
  Laptop,
  Briefcase,
  Moon,
  Clock,
  Coffee,
  Sparkles,
  Heart,
  Music,
  Code,
  Calendar,
  LucideProps,
} from 'lucide-react';
import { CategoryId, CATEGORIES } from '@/models/category';

interface CategoryIconProps extends LucideProps {
  name?: string;
  category?: CategoryId;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, category, className, size = 18, ...props }) => {
  const iconName = name || (category ? CATEGORIES[category]?.icon : 'Clock');
  const catColor = category ? CATEGORIES[category]?.color : undefined;

  const getIconComponent = () => {
    switch (iconName?.toLowerCase()) {
      case 'book':
      case 'bookopen':
        return BookOpen;
      case 'dumbbell':
        return Dumbbell;
      case 'soup':
        return Soup;
      case 'utensils':
        return Utensils;
      case 'bus':
        return Bus;
      case 'graduationcap':
        return GraduationCap;
      case 'laptop':
        return Laptop;
      case 'briefcase':
        return Briefcase;
      case 'moon':
        return Moon;
      case 'coffee':
        return Coffee;
      case 'sparkles':
        return Sparkles;
      case 'heart':
        return Heart;
      case 'music':
        return Music;
      case 'code':
        return Code;
      case 'calendar':
        return Calendar;
      default:
        return Clock;
    }
  };

  const IconComponent = getIconComponent();

  return (
    <IconComponent
      size={size}
      className={className}
      style={catColor && !props.color ? { color: catColor } : undefined}
      {...props}
    />
  );
};

