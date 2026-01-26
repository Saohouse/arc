"use client";

import { useState } from "react";
import { COMMON_LOCATION_EMOJIS, getDefaultLocationIcon, LocationType } from "@/lib/location-icons";

type IconPickerProps = {
  value: string | null;
  onChange: (icon: string) => void;
  locationType?: LocationType;
};

export function IconPicker({ value, onChange, locationType }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultIcon = getDefaultLocationIcon(locationType || null);
  const currentIcon = value || defaultIcon;

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const handleReset = () => {
    onChange(defaultIcon);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-foreground mb-2">
        Location Icon
      </label>
      
      <div className="flex gap-2">
        {/* Current Icon Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-16 h-16 text-4xl rounded-lg border-2 border-foreground/20 hover:border-foreground/40 hover:bg-muted/50 transition-all"
          title="Click to change icon"
        >
          {currentIcon}
        </button>

        {/* Icon Info */}
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            Current: {currentIcon}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Reset to default
          </button>
          <div className="text-xs text-muted-foreground mt-1">
            Click icon to choose from library
          </div>
        </div>
      </div>

      {/* Emoji Picker Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker */}
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-background border rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Choose Icon</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-8 gap-2">
              {COMMON_LOCATION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className={`
                    w-10 h-10 text-2xl flex items-center justify-center rounded transition-all
                    hover:bg-muted hover:scale-110
                    ${currentIcon === emoji ? "bg-foreground/10 ring-2 ring-foreground/30" : ""}
                  `}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 text-sm text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-muted rounded transition-colors"
              >
                Use Default ({defaultIcon})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
