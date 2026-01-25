import { getTraitById, PsychologyTrait } from "./psychology-traits";

export type CompatibilityScore = {
  level: "healthy" | "challenging" | "toxic" | "growth";
  score: number; // 0-100
  warnings: string[];
  strengths: string[];
  growthAreas: string[];
};

/**
 * Calculate compatibility between two characters based on their psychology traits
 */
export function calculateCompatibility(
  traits1: string[], // trait IDs
  traits2: string[]
): CompatibilityScore {
  const char1Traits = traits1.map(getTraitById).filter(Boolean) as PsychologyTrait[];
  const char2Traits = traits2.map(getTraitById).filter(Boolean) as PsychologyTrait[];

  if (char1Traits.length === 0 || char2Traits.length === 0) {
    return {
      level: "healthy",
      score: 50,
      warnings: [],
      strengths: [],
      growthAreas: [],
    };
  }

  let toxicCount = 0;
  let conflictCount = 0;
  let synergyCount = 0;
  let growthCount = 0;

  const warnings: string[] = [];
  const strengths: string[] = [];
  const growthAreas: string[] = [];

  // Check traits bidirectionally to ensure symmetric compatibility
  // We need to check both: char1 traits against char2 traits AND char2 traits against char1 traits
  const allTraitPairs = [
    { fromTraits: char1Traits, toTraits: char2Traits },
    { fromTraits: char2Traits, toTraits: char1Traits },
  ];

  allTraitPairs.forEach(({ fromTraits, toTraits }) => {
    fromTraits.forEach((trait1) => {
      const trait2Ids = toTraits.map((t) => t.id);

      // Check for toxic combinations
      const toxicMatches = trait1.toxicWith.filter((id) => trait2Ids.includes(id));
      if (toxicMatches.length > 0) {
        toxicMatches.forEach((id) => {
          const trait2 = getTraitById(id);
          const warningMsg = `⚠️ Toxic dynamic: ${trait1.name} + ${trait2?.name} - High risk of emotional harm`;
          // Avoid duplicates by checking if reverse already exists
          if (!warnings.includes(warningMsg)) {
            toxicCount++;
            warnings.push(warningMsg);
          }
        });
      }

      // Check for conflicts
      const conflictMatches = trait1.conflictsWith.filter((id) => trait2Ids.includes(id));
      if (conflictMatches.length > 0) {
        conflictMatches.forEach((id) => {
          const trait2 = getTraitById(id);
          const warningMsg = `⚡ Conflict: ${trait1.name} + ${trait2?.name} - Frequent disagreements likely`;
          if (!warnings.includes(warningMsg)) {
            conflictCount++;
            warnings.push(warningMsg);
          }
        });
      }

      // Check for synergies
      const synergyMatches = trait1.synergizesWith.filter((id) => trait2Ids.includes(id));
      if (synergyMatches.length > 0) {
        synergyMatches.forEach((id) => {
          const trait2 = getTraitById(id);
          const strengthMsg = `✅ Synergy: ${trait1.name} + ${trait2?.name} - Natural compatibility`;
          if (!strengths.includes(strengthMsg)) {
            synergyCount++;
            strengths.push(strengthMsg);
          }
        });
      }

      // Check for growth opportunities
      const growthMatches = trait1.growthOpportunities.filter((id) => trait2Ids.includes(id));
      if (growthMatches.length > 0) {
        growthMatches.forEach((id) => {
          const trait2 = getTraitById(id);
          const growthMsg = `🌱 Growth: ${trait1.name} can learn from ${trait2?.name} - Positive influence`;
          if (!growthAreas.includes(growthMsg)) {
            growthCount++;
            growthAreas.push(growthMsg);
          }
        });
      }
    });
  });

  // Calculate score (0-100)
  const totalInteractions = toxicCount + conflictCount + synergyCount + growthCount || 1;
  const positiveScore = (synergyCount * 2 + growthCount) / totalInteractions;
  const negativeScore = (toxicCount * 3 + conflictCount) / totalInteractions;
  
  let score = Math.round((positiveScore - negativeScore) * 50 + 50);
  score = Math.max(0, Math.min(100, score)); // Clamp 0-100

  // Determine compatibility level
  let level: CompatibilityScore["level"];
  if (toxicCount > 0) {
    level = "toxic";
  } else if (score >= 70) {
    level = "healthy";
  } else if (score >= 50) {
    level = growthCount > 0 ? "growth" : "challenging";
  } else {
    level = "challenging";
  }

  return {
    level,
    score,
    warnings,
    strengths,
    growthAreas,
  };
}

/**
 * Get compatibility color for UI
 */
export function getCompatibilityColor(level: CompatibilityScore["level"]): string {
  switch (level) {
    case "healthy":
      return "text-green-600 dark:text-green-400";
    case "growth":
      return "text-blue-600 dark:text-blue-400";
    case "challenging":
      return "text-yellow-600 dark:text-yellow-400";
    case "toxic":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get compatibility icon for UI
 */
export function getCompatibilityIcon(level: CompatibilityScore["level"]): string {
  switch (level) {
    case "healthy":
      return "🟢";
    case "growth":
      return "🔵";
    case "challenging":
      return "🟡";
    case "toxic":
      return "🔴";
  }
}

/**
 * Get compatibility label for UI
 */
export function getCompatibilityLabel(level: CompatibilityScore["level"]): string {
  switch (level) {
    case "healthy":
      return "Healthy";
    case "growth":
      return "Growth Opportunity";
    case "challenging":
      return "Challenging";
    case "toxic":
      return "Toxic";
  }
}
