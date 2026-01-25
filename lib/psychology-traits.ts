// Psychology Trait Library with Compatibility Rules

export type TraitCategory = 
  | "personality"
  | "attachment"
  | "values"
  | "behavioral"
  | "cognitive";

export type CompatibilityLevel = "healthy" | "challenging" | "toxic" | "growth";

export interface PsychologyTrait {
  id: string;
  name: string;
  category: TraitCategory;
  description: string;
  
  // Compatibility rules
  conflictsWith: string[]; // Trait IDs that create conflict
  synergizesWith: string[]; // Trait IDs that work well together
  growthOpportunities: string[]; // Trait IDs that enable growth
  toxicWith: string[]; // Trait IDs that create toxic dynamics
}

export const PSYCHOLOGY_TRAITS: PsychologyTrait[] = [
  // ===== PERSONALITY TRAITS =====
  {
    id: "narcissistic",
    name: "Narcissistic",
    category: "personality",
    description: "Self-focused, needs constant admiration, lacks empathy for others",
    conflictsWith: ["empathetic", "assertive", "independent"],
    synergizesWith: ["codependent", "people-pleaser"],
    growthOpportunities: ["secure-attachment"],
    toxicWith: ["empathetic", "anxious-attachment", "people-pleaser"],
  },
  {
    id: "empathetic",
    name: "Empathetic",
    category: "personality",
    description: "Highly sensitive to others' emotions, deeply caring",
    conflictsWith: ["narcissistic", "antisocial", "emotionally-distant"],
    synergizesWith: ["secure-attachment", "open-minded", "compassionate"],
    growthOpportunities: ["assertive", "independent"],
    toxicWith: ["narcissistic", "manipulative", "gaslighter"],
  },
  {
    id: "antisocial",
    name: "Antisocial",
    category: "personality",
    description: "Disregards rules and rights of others, lacks remorse",
    conflictsWith: ["empathetic", "rule-follower", "morally-driven"],
    synergizesWith: ["manipulative", "power-hungry"],
    growthOpportunities: [],
    toxicWith: ["empathetic", "trusting", "naive"],
  },
  {
    id: "anxious",
    name: "Anxious",
    category: "personality",
    description: "Prone to worry, overthinking, and fear of failure",
    conflictsWith: ["impulsive", "reckless", "carefree"],
    synergizesWith: ["cautious", "detail-oriented", "empathetic"],
    growthOpportunities: ["secure-attachment", "confident"],
    toxicWith: ["critical", "perfectionist", "controlling"],
  },
  {
    id: "confident",
    name: "Confident",
    category: "personality",
    description: "Self-assured, believes in their abilities",
    conflictsWith: ["insecure", "self-doubting"],
    synergizesWith: ["assertive", "independent", "ambitious"],
    growthOpportunities: ["humble", "empathetic"],
    toxicWith: ["arrogant"],
  },
  {
    id: "introverted",
    name: "Introverted",
    category: "personality",
    description: "Prefers solitude, recharges alone, selective with social energy",
    conflictsWith: ["attention-seeking", "extroverted-extreme"],
    synergizesWith: ["introspective", "creative", "independent"],
    growthOpportunities: ["socially-confident"],
    toxicWith: [],
  },
  {
    id: "extroverted",
    name: "Extroverted",
    category: "personality",
    description: "Gains energy from social interaction, thrives in groups",
    conflictsWith: ["reclusive", "socially-avoidant"],
    synergizesWith: ["charismatic", "people-oriented"],
    growthOpportunities: ["introspective"],
    toxicWith: ["attention-seeking"],
  },

  // ===== ATTACHMENT STYLES =====
  {
    id: "secure-attachment",
    name: "Secure Attachment",
    category: "attachment",
    description: "Comfortable with intimacy and independence, trusts easily",
    conflictsWith: [],
    synergizesWith: ["empathetic", "honest", "direct-communicator"],
    growthOpportunities: ["anxious-attachment", "avoidant-attachment"],
    toxicWith: [],
  },
  {
    id: "anxious-attachment",
    name: "Anxious Attachment",
    category: "attachment",
    description: "Fears abandonment, needs constant reassurance, clingy",
    conflictsWith: ["avoidant-attachment", "independent", "emotionally-distant"],
    synergizesWith: ["reassuring", "patient"],
    growthOpportunities: ["secure-attachment"],
    toxicWith: ["avoidant-attachment", "narcissistic", "emotionally-unavailable"],
  },
  {
    id: "avoidant-attachment",
    name: "Avoidant Attachment",
    category: "attachment",
    description: "Emotionally distant, values independence over intimacy",
    conflictsWith: ["anxious-attachment", "clingy", "emotionally-expressive"],
    synergizesWith: ["independent", "self-sufficient"],
    growthOpportunities: ["secure-attachment"],
    toxicWith: ["anxious-attachment", "needy"],
  },
  {
    id: "disorganized-attachment",
    name: "Disorganized Attachment",
    category: "attachment",
    description: "Wants intimacy but fears it, unpredictable in relationships",
    conflictsWith: ["secure-attachment", "stable"],
    synergizesWith: [],
    growthOpportunities: ["secure-attachment", "therapy-minded"],
    toxicWith: ["volatile", "unpredictable"],
  },

  // ===== CORE VALUES =====
  {
    id: "power-hungry",
    name: "Power-Hungry",
    category: "values",
    description: "Driven by control and dominance, seeks authority",
    conflictsWith: ["equality-driven", "humble", "submissive"],
    synergizesWith: ["ambitious", "competitive"],
    growthOpportunities: ["empathetic", "collaborative"],
    toxicWith: ["submissive", "people-pleaser"],
  },
  {
    id: "freedom-seeking",
    name: "Freedom-Seeking",
    category: "values",
    description: "Values independence and autonomy above all",
    conflictsWith: ["controlling", "traditional", "rule-follower"],
    synergizesWith: ["independent", "adventurous"],
    growthOpportunities: ["commitment-oriented"],
    toxicWith: ["controlling", "possessive"],
  },
  {
    id: "security-driven",
    name: "Security-Driven",
    category: "values",
    description: "Seeks stability, predictability, and safety",
    conflictsWith: ["risk-taker", "impulsive", "chaotic"],
    synergizesWith: ["cautious", "reliable", "loyal"],
    growthOpportunities: ["adventurous"],
    toxicWith: ["reckless", "unstable"],
  },
  {
    id: "love-oriented",
    name: "Love-Oriented",
    category: "values",
    description: "Prioritizes relationships and emotional connection",
    conflictsWith: ["emotionally-distant", "career-obsessed"],
    synergizesWith: ["empathetic", "romantic", "family-oriented"],
    growthOpportunities: ["independent"],
    toxicWith: ["emotionally-unavailable"],
  },

  // ===== BEHAVIORAL PATTERNS =====
  {
    id: "dominant",
    name: "Dominant",
    category: "behavioral",
    description: "Takes control, leads, makes decisions for others",
    conflictsWith: ["dominant", "assertive", "independent"],
    synergizesWith: ["submissive", "follower"],
    growthOpportunities: ["collaborative", "listener"],
    toxicWith: ["submissive-extreme", "people-pleaser"],
  },
  {
    id: "submissive",
    name: "Submissive",
    category: "behavioral",
    description: "Defers to others, avoids conflict, follows rather than leads",
    conflictsWith: ["dominant-extreme", "controlling"],
    synergizesWith: ["patient", "understanding"],
    growthOpportunities: ["assertive", "confident"],
    toxicWith: ["controlling", "narcissistic", "abusive"],
  },
  {
    id: "assertive",
    name: "Assertive",
    category: "behavioral",
    description: "Stands up for themselves, communicates needs clearly",
    conflictsWith: ["passive-aggressive", "submissive-extreme"],
    synergizesWith: ["direct-communicator", "confident", "honest"],
    growthOpportunities: ["empathetic", "flexible"],
    toxicWith: ["passive-aggressive", "manipulative"],
  },
  {
    id: "passive-aggressive",
    name: "Passive-Aggressive",
    category: "behavioral",
    description: "Expresses hostility indirectly, avoids direct confrontation",
    conflictsWith: ["direct-communicator", "assertive", "confrontational"],
    synergizesWith: ["conflict-avoidant"],
    growthOpportunities: ["assertive", "honest"],
    toxicWith: ["direct-communicator", "impatient"],
  },
  {
    id: "manipulative",
    name: "Manipulative",
    category: "behavioral",
    description: "Uses others for personal gain, deceptive, exploitative",
    conflictsWith: ["honest", "direct", "perceptive"],
    synergizesWith: ["narcissistic", "power-hungry"],
    growthOpportunities: [],
    toxicWith: ["empathetic", "trusting", "naive"],
  },
  {
    id: "people-pleaser",
    name: "People-Pleaser",
    category: "behavioral",
    description: "Sacrifices own needs to make others happy, fears rejection",
    conflictsWith: ["selfish", "self-focused"],
    synergizesWith: ["appreciative", "grateful"],
    growthOpportunities: ["assertive", "self-loving"],
    toxicWith: ["narcissistic", "exploitative", "manipulative"],
  },

  // ===== COGNITIVE PATTERNS =====
  {
    id: "analytical",
    name: "Analytical",
    category: "cognitive",
    description: "Logical, rational, makes decisions based on data",
    conflictsWith: ["impulsive", "emotional-decision-maker"],
    synergizesWith: ["detail-oriented", "methodical"],
    growthOpportunities: ["emotionally-aware"],
    toxicWith: [],
  },
  {
    id: "impulsive",
    name: "Impulsive",
    category: "cognitive",
    description: "Acts without thinking, spontaneous, risk-taking",
    conflictsWith: ["cautious", "analytical", "risk-averse"],
    synergizesWith: ["adventurous", "spontaneous"],
    growthOpportunities: ["mindful", "self-controlled"],
    toxicWith: ["security-driven", "anxious"],
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    category: "cognitive",
    description: "Sets unrealistically high standards, fears failure",
    conflictsWith: ["laid-back", "carefree", "messy"],
    synergizesWith: ["detail-oriented", "high-achieving"],
    growthOpportunities: ["self-compassionate"],
    toxicWith: ["anxious", "self-critical"],
  },
  {
    id: "creative",
    name: "Creative",
    category: "cognitive",
    description: "Thinks outside the box, imaginative, unconventional",
    conflictsWith: ["rigid", "traditional", "rule-bound"],
    synergizesWith: ["open-minded", "curious", "flexible"],
    growthOpportunities: ["disciplined"],
    toxicWith: [],
  },
];

// Category labels for UI
export const TRAIT_CATEGORIES: Record<TraitCategory, string> = {
  personality: "Personality Traits",
  attachment: "Attachment Styles",
  values: "Core Values",
  behavioral: "Behavioral Patterns",
  cognitive: "Cognitive Patterns",
};

// Get traits by category
export function getTraitsByCategory(category: TraitCategory): PsychologyTrait[] {
  return PSYCHOLOGY_TRAITS.filter((t) => t.category === category);
}

// Get trait by ID
export function getTraitById(id: string): PsychologyTrait | undefined {
  return PSYCHOLOGY_TRAITS.find((t) => t.id === id);
}

// Search traits
export function searchTraits(query: string): PsychologyTrait[] {
  const lowerQuery = query.toLowerCase();
  return PSYCHOLOGY_TRAITS.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  );
}
