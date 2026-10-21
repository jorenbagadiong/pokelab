"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { usePressFeedback } from "@/hooks/use-press-feedback";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const onPress = usePressFeedback();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <IconButton label={`Switch to ${next} theme`} onPointerDown={onPress} onClick={toggleTheme} size="sm">
      {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </IconButton>
  );
}
