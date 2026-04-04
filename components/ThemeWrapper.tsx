'use client';

import { useEffect, useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

export default function ThemeWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ThemeSwitcher />;
}
