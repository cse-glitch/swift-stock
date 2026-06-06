import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

interface ThemeToggleProps {
  /** Show a text label next to the icon */
  showLabel?: boolean;
  /** Compact/small variant for the header */
  size?: "sm" | "md";
  className?: string;
}

export function ThemeToggle({ showLabel, size = "md", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    // Render a skeleton placeholder to prevent layout shift
    return (
      <div
        className={cn(
          size === "sm" ? "h-8 w-8" : "h-9 w-9",
          "rounded-full bg-muted/50 animate-pulse",
          className
        )}
      />
    );
  }

  if (showLabel) {
    // Pill-style toggle with label — matching SettingsRow styles in profile
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "flex items-center gap-3.5 px-4 py-3.5 w-full transition-colors",
          "hover:bg-muted/30 active:bg-muted/60",
          className
        )}
      >
        {/* Animated icon container */}
        <div
          className={cn(
            "relative h-9 w-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
            isDark ? "bg-indigo-500/10" : "bg-amber-500/10",
            "transition-colors duration-300"
          )}
        >
          {/* Sun icon */}
          <Sun
            className={cn(
              "absolute h-4 w-4 text-amber-500 transition-all duration-300",
              isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
            )}
          />
          {/* Moon icon */}
          <Moon
            className={cn(
              "absolute h-4 w-4 text-indigo-400 transition-all duration-300",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            )}
          />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold leading-none">Appearance</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {isDark ? "Dark mode" : "Light mode"}
          </p>
        </div>

        {/* The switch (visual only, clicks bubble to button) */}
        <div className="pointer-events-none shrink-0">
          <Switch checked={isDark} />
        </div>
      </button>
    );
  }

  // Icon-only button — used in the header bar
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden",
        "border border-border/60 bg-muted/30 backdrop-blur-sm",
        "hover:bg-muted/60 hover:border-border",
        "active:scale-95",
        "transition-all duration-200",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className
      )}
    >
      {/* Glow backdrop */}
      <span
        className={cn(
          "absolute inset-0 rounded-full opacity-0 transition-opacity duration-300",
          isDark
            ? "bg-indigo-500/10 group-hover:opacity-100"
            : "bg-amber-500/10 group-hover:opacity-100"
        )}
      />

      {/* Sun */}
      <Sun
        className={cn(
          "absolute transition-all duration-300",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          "text-amber-500",
          isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
        )}
      />

      {/* Moon */}
      <Moon
        className={cn(
          "absolute transition-all duration-300",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          "text-indigo-400",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
        )}
      />
    </button>
  );
}
