import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../features/common/useTheme.store';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
      title="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-gray-700" />
      ) : (
        <Sun className="h-4 w-4 text-yellow-400" />
      )}
    </button>
  );
}
