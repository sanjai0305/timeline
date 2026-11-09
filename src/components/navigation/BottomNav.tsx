import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ListChecks, Calendar as CalendarIcon, User } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/routines', label: 'Routines', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/profile', label: 'Profile', icon: User },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  // Hide bottom nav on routine detail or create routine if preferred, or keep on all screens?
  // In the reference image:
  // Screen 1 (Home): Bottom nav is visible!
  // Screen 2 (Create Routine): Bottom has the large "Create Routine" button!
  // Screen 3 (Routine Details): Vertical timetable scrolls to bottom.
  // The prompt says:
  // "Use a fixed bottom navigation bar inspired by the reference image.
  // Each navigation item must work correctly and show its active state."
  // So on routes like `/create` or `/routines/:id/edit` we might hide it or show it.
  // When on `/create`, the fixed bottom button is "✓ Create Routine", so bottom nav shouldn't overlap it.
  const isCreateScreen = location.pathname.startsWith('/create') || location.pathname.includes('/edit');

  if (isCreateScreen) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121226]/95 backdrop-blur-lg border-t border-white/5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="max-w-md mx-auto px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 group relative ${
                isActive ? 'text-brand-purple' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-purple/20 text-brand-accent shadow-glow-purple-sm'
                    : 'text-text-muted group-hover:text-text-secondary'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span className={`text-[11px] font-medium tracking-tight mt-0.5 ${isActive ? 'text-brand-accent font-semibold' : 'text-text-muted'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

