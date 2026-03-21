'use client';

import { useTheme, ColorTheme } from '@/lib/theme-context';
import { Sun, Moon, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function ThemeSwitcher() {
  const { mode, colorTheme, setMode, setColorTheme, toggleMode } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorThemes: { name: ColorTheme; label: string; colors: string; ringColor: string; dotColor: string }[] = [
    {
      name: 'blue',
      label: 'Blue',
      colors: 'from-blue-500 to-blue-600',
      ringColor: 'ring-blue-500',
      dotColor: '#2563eb'
    },
    {
      name: 'purple',
      label: 'Purple',
      colors: 'from-purple-500 to-purple-600',
      ringColor: 'ring-purple-500',
      dotColor: '#7c3aed'
    },
    {
      name: 'green',
      label: 'Green',
      colors: 'from-green-500 to-green-600',
      ringColor: 'ring-green-500',
      dotColor: '#059669'
    },
    {
      name: 'orange',
      label: 'Orange',
      colors: 'from-orange-500 to-orange-600',
      ringColor: 'ring-orange-500',
      dotColor: '#ea580c'
    },
    {
      name: 'pink',
      label: 'Pink',
      colors: 'from-pink-500 to-pink-600',
      ringColor: 'ring-pink-500',
      dotColor: '#ec4899'
    },
  ];

  return (
    <div className="fixed top-4 right-16 sm:right-20 z-50 flex items-center gap-2">
      {/* Dark/Light Mode Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMode}
        className="p-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-gray-600 transition-colors hover:shadow-md"
        aria-label="Toggle theme mode"
      >
        {mode === 'light' ? (
          <Sun className="w-4 h-4 text-yellow-500" />
        ) : (
          <Moon className="w-4 h-4 text-blue-400" />
        )}
      </motion.button>

      {/* Color Theme Picker - DISABLED FOR NOW (Future Feature)
      TODO: Re-enable color themes in future release */}
      {false && <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
          aria-label="Choose color theme"
        >
          <Palette className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </motion.button>

        {/* Color Picker Dropdown */}
        <AnimatePresence>
          {showColorPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColorPicker(false)}
              />

              {/* Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
              >
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Choose Color Theme
                </h3>

                <div className="space-y-2">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        setColorTheme(theme.name);
                        setShowColorPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        colorTheme === theme.name
                          ? `bg-gray-100 dark:bg-gray-700 ring-2 ${theme.ringColor} ring-offset-2 dark:ring-offset-gray-800`
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.colors} shadow-md`}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {theme.label}
                      </span>
                      {colorTheme === theme.name && (
                        <motion.div
                          layoutId="active-theme"
                          className="ml-auto w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.dotColor }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>}
    </div>
  );
}
