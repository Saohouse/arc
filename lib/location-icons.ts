/**
 * Location Icon Utilities
 * Provides default icons and helpers for location visualization
 */

export type LocationType = "country" | "province" | "city" | "town" | null;
export type IconType = "emoji" | "svg-ref" | "svg-inline" | "custom-upload" | "ai-generated";

/**
 * Get default emoji icon for a location type
 */
export function getDefaultLocationIcon(locationType: LocationType): string {
  switch (locationType) {
    case "country":
      return "🌍";
    case "province":
      return "🏛️";
    case "city":
      return "🏙️";
    case "town":
      return "🏘️";
    default:
      return "📍";
  }
}

/**
 * Get a descriptive label for location type
 */
export function getLocationTypeLabel(locationType: LocationType): string {
  switch (locationType) {
    case "country":
      return "Country";
    case "province":
      return "Province/State/Region";
    case "city":
      return "City";
    case "town":
      return "Town/Village";
    default:
      return "Standalone Location";
  }
}

/**
 * Get all available location type options
 */
export function getLocationTypeOptions(): Array<{ value: LocationType; label: string; icon: string }> {
  return [
    { value: null, label: "Standalone Location", icon: "📍" },
    { value: "country", label: "Country", icon: "🌍" },
    { value: "province", label: "Province/State/Region", icon: "🏛️" },
    { value: "city", label: "City", icon: "🏙️" },
    { value: "town", label: "Town/Village", icon: "🏘️" },
  ];
}

/**
 * Get zoom level for location type (for hierarchical map display)
 */
export function getZoomLevelForType(locationType: LocationType): number {
  switch (locationType) {
    case "country":
      return 0; // World level
    case "province":
      return 1; // Country level
    case "city":
      return 2; // Province level
    case "town":
      return 3; // City level
    default:
      return 0; // Default to world level
  }
}

/**
 * Common emoji icons for location picker
 */
export const COMMON_LOCATION_EMOJIS = [
  // Places
  "🌍", "🌎", "🌏", "🗺️", "🗾",
  // Buildings & Structures
  "🏛️", "🏰", "🏯", "🏟️", "🗼", "🗽", "⛪", "🕌", "🛕", "🕍",
  // Urban
  "🏙️", "🌆", "🌃", "🌇", "🏘️", "🏚️",
  // Nature
  "🏔️", "⛰️", "🗻", "🏕️", "🏞️", "🏝️", "🏖️", "🏜️",
  // Water
  "🌊", "💧", "🌀",
  // Transport
  "🚢", "⚓", "🛥️", "⛵", "🚂", "🚉", "✈️", "🛩️",
  // Markers
  "📍", "📌", "🚩", "⭐", "✨", "💫",
];
