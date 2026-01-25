/**
 * The Frank Daniel Method
 * 
 * Frank Daniel (1926-1996) was a legendary Czech-American film director, producer, and teacher
 * who revolutionized screenwriting pedagogy. His question-based approach to story analysis
 * became the foundation of modern narrative structure teaching at institutions like USC, 
 * Columbia University, and the American Film Institute.
 * 
 * This systematic questioning method helps writers deeply understand their characters' 
 * motivations, conflicts, and arcs before writing a single scene.
 */

export interface WizardSection {
  id: string;
  title: string;
  description: string;
  questions: WizardQuestion[];
}

export interface WizardQuestion {
  id: string;
  question: string;
  placeholder?: string;
  helpText?: string;
}

export const CHARACTER_TYPES = [
  { value: "protagonist", label: "Protagonist", description: "The main character we follow" },
  { value: "antagonist", label: "Antagonist", description: "The opposition or villain" },
  { value: "support", label: "Supporting Character", description: "Allies, mentors, sidekicks" },
  { value: "love_interest", label: "Love Interest", description: "Romantic partner or potential partner" },
  { value: "mentor", label: "Mentor", description: "Guide, teacher, or wisdom figure" },
  { value: "comic_relief", label: "Comic Relief", description: "Provides humor and levity" },
  { value: "foil", label: "Foil", description: "Contrasts with and highlights the protagonist" },
  { value: "other", label: "Other", description: "Custom character type" },
];

export const FRANK_DANIEL_SECTIONS: WizardSection[] = [
  {
    id: "character_type",
    title: "CHARACTER TYPE",
    description: "What role do they play?",
    questions: [
      {
        id: "type",
        question: "What type of character is this?",
        placeholder: "Select or describe their role in the story...",
        helpText: "Understanding their role helps focus the development questions"
      },
      {
        id: "type_notes",
        question: "Additional notes about their role",
        placeholder: "Any specific details about how they serve this role in your story...",
        helpText: "Optional: Clarify their unique take on this character type"
      },
    ],
  },
  {
    id: "core_identity",
    title: "I. CORE IDENTITY",
    description: "Who they are",
    questions: [
      {
        id: "who",
        question: "Who is this character?",
        placeholder: "Their name, role, and position in the story...",
        helpText: "Start with the basics - who are they in one sentence?"
      },
      {
        id: "why_care",
        question: "Why should we care about them?",
        placeholder: "What makes them memorable or important?",
        helpText: "What makes them worth including in the story?"
      },
      {
        id: "attraction",
        question: "What immediately attracts us to them?",
        placeholder: "First impression, magnetic quality...",
        helpText: "What draws us in from the very first moment?"
      },
      {
        id: "sympathetic",
        question: "What makes them sympathetic, intimidating, or intriguing?",
        placeholder: "Vulnerability, power, mystery...",
        helpText: "What's our emotional relationship with them?"
      },
      {
        id: "unique",
        question: "What makes them unique?",
        placeholder: "What sets them apart from everyone else...",
        helpText: "Their distinctive quality that makes them unforgettable"
      },
      {
        id: "mystery",
        question: "What is their 'mystery'?",
        placeholder: "Hidden depth, secret, unspoken past...",
        helpText: "What about them intrigues us? What do we want to understand?"
      },
      {
        id: "magic",
        question: "What is their magic, aura, or quiet power?",
        placeholder: "Special presence, unusual talent, inner strength...",
        helpText: "The intangible quality that makes them special"
      },
      {
        id: "behavior",
        question: "How does this show up in behavior, choices, or silence?",
        placeholder: "Specific actions, decisions, moments of restraint...",
        helpText: "How do we see their essence in action?"
      },
      {
        id: "reaction",
        question: "How should the audience feel about them?",
        placeholder: "Laugh at them, admire them, fear them, root for them...",
        helpText: "What's the intended emotional response?"
      },
    ],
  },
  {
    id: "desire_need",
    title: "II. DESIRE VS NEED",
    description: "What drives them",
    questions: [
      {
        id: "want",
        question: "What do they want (clear, conscious, tangible)?",
        placeholder: "Their stated goal, what they're actively pursuing...",
        helpText: "The surface-level desire that drives their actions"
      },
      {
        id: "need",
        question: "What do they need (emotional, subconscious)?",
        placeholder: "What they actually need to be whole or to succeed...",
        helpText: "The deeper truth about what would truly help them"
      },
      {
        id: "peace",
        question: "Why can't they live at peace without it?",
        placeholder: "What's at stake emotionally...",
        helpText: "Why is this non-negotiable for them?"
      },
      {
        id: "fear",
        question: "What are they afraid of?",
        placeholder: "Deepest fear, what keeps them up at night...",
        helpText: "The shadow that haunts them"
      },
      {
        id: "hope",
        question: "What do we hope for them?",
        placeholder: "What would make us feel satisfied for this character...",
        helpText: "The audience's emotional investment in their journey"
      },
    ],
  },
  {
    id: "stakes",
    title: "III. STAKES",
    description: "Why it matters",
    questions: [
      {
        id: "worst",
        question: "What's the worst thing that could happen to them?",
        placeholder: "The nightmare scenario...",
        helpText: "Maximum consequence of failure"
      },
      {
        id: "best",
        question: "What's the best moment they'll experience?",
        placeholder: "Peak triumph or joy...",
        helpText: "The dream outcome"
      },
      {
        id: "loss",
        question: "What will they lose if they fail?",
        placeholder: "Specific losses - relationship, status, identity...",
        helpText: "Concrete consequences"
      },
      {
        id: "forbidden",
        question: "What can't they have — and why?",
        placeholder: "The impossible desire and the reason...",
        helpText: "What fundamental barrier exists?"
      },
      {
        id: "deadline",
        question: "Is there a deadline or time pressure?",
        placeholder: "Ticking clock, time limit...",
        helpText: "When must they act?"
      },
      {
        id: "pressure_source",
        question: "Who creates it?",
        placeholder: "Person, force, or circumstance...",
        helpText: "Where does the urgency come from?"
      },
      {
        id: "realization",
        question: "When do they realize they're in trouble?",
        placeholder: "The moment awareness hits...",
        helpText: "Point of no return"
      },
      {
        id: "threat_nature",
        question: "What makes the threat humiliating, painful, or unavoidable?",
        placeholder: "Why they can't just walk away...",
        helpText: "What makes this personal?"
      },
    ],
  },
  {
    id: "obstacles",
    title: "IV. OBSTACLES & CONFLICT",
    description: "What blocks them",
    questions: [
      {
        id: "external",
        question: "Who or what actively blocks the goal?",
        placeholder: "External forces, people, systems...",
        helpText: "The opposition in the world"
      },
      {
        id: "impossible",
        question: "Why is the obvious solution impossible?",
        placeholder: "Why the easy path won't work...",
        helpText: "What complicates simple resolution?"
      },
      {
        id: "unavoidable",
        question: "Why can't the problem be ignored or escaped?",
        placeholder: "Why they must face this...",
        helpText: "What makes confrontation necessary?"
      },
      {
        id: "enforcer",
        question: "Who ensures it must be faced?",
        placeholder: "The character or force that won't let them run...",
        helpText: "Who holds them accountable?"
      },
      {
        id: "internal",
        question: "What doubts, scruples, fears hold them back?",
        placeholder: "Internal barriers, moral dilemmas...",
        helpText: "The enemy within"
      },
      {
        id: "false_beliefs",
        question: "What false beliefs do they carry?",
        placeholder: "Misconceptions about themselves or the world...",
        helpText: "Lies they believe"
      },
      {
        id: "expectations",
        question: "What do they expect that won't happen?",
        placeholder: "Misplaced hopes or assumptions...",
        helpText: "The surprise waiting for them"
      },
      {
        id: "unknown",
        question: "What don't they know yet?",
        placeholder: "Hidden information that changes everything...",
        helpText: "The truth they'll discover"
      },
    ],
  },
  {
    id: "antagonists",
    title: "V. ANTAGONISTIC FORCES",
    description: "Opposition",
    questions: [
      {
        id: "who",
        question: "Who tries to stop, humiliate, or destroy the protagonist?",
        placeholder: "The antagonist(s) and their methods...",
        helpText: "Who stands in their way?"
      },
      {
        id: "antagonist_want",
        question: "What do they want and need?",
        placeholder: "The antagonist's own desires...",
        helpText: "Every villain is the hero of their own story"
      },
      {
        id: "justification",
        question: "How do they justify their actions?",
        placeholder: "Their moral framework, reasoning...",
        helpText: "Why they believe they're right"
      },
      {
        id: "knows_secret",
        question: "Do they know the hero's secret desires?",
        placeholder: "What leverage do they have...",
        helpText: "Can they exploit vulnerabilities?"
      },
      {
        id: "tactics",
        question: "What traps, lies, mimicry, or subterfuge do they use?",
        placeholder: "Specific strategies and manipulations...",
        helpText: "Their playbook"
      },
      {
        id: "mislead",
        question: "How do they mislead or confuse the hero?",
        placeholder: "Deceptions, misdirections...",
        helpText: "How they control the narrative"
      },
      {
        id: "reveal",
        question: "When does the audience learn their true intentions?",
        placeholder: "Timing of the reveal...",
        helpText: "Plot twist or gradual understanding?"
      },
    ],
  },
  {
    id: "allies",
    title: "VI. ALLIES & MIRRORS",
    description: "Contrast characters",
    questions: [
      {
        id: "reliable",
        question: "Who can the hero rely on?",
        placeholder: "True allies, support system...",
        helpText: "Who shows up when it matters?"
      },
      {
        id: "false_hope",
        question: "Who do they hope will help but won't?",
        placeholder: "Disappointing allies, betrayals...",
        helpText: "Who fails them?"
      },
      {
        id: "catalyst",
        question: "Who acts as a catalyst for change?",
        placeholder: "Characters who push transformation...",
        helpText: "Who forces growth?"
      },
      {
        id: "mirrors",
        question: "Who faces a similar dilemma but chooses differently?",
        placeholder: "Parallel characters making opposite choices...",
        helpText: "The road not taken"
      },
      {
        id: "compromises",
        question: "What compromises or failures do these characters represent?",
        placeholder: "What they show about cost of choices...",
        helpText: "Alternative outcomes personified"
      },
      {
        id: "relationships",
        question: "What relationships become strained or transformed?",
        placeholder: "Evolving dynamics, broken bonds...",
        helpText: "How connections change under pressure"
      },
    ],
  },
  {
    id: "world",
    title: "VII. WORLD & SETTING",
    description: "Where it happens",
    questions: [
      {
        id: "mood",
        question: "What is the mood of the world?",
        placeholder: "Atmosphere, feeling, tone...",
        helpText: "What does the world feel like?"
      },
      {
        id: "personality",
        question: "Does the environment have a personality?",
        placeholder: "How the setting acts as a character...",
        helpText: "Is the world hostile, nurturing, indifferent?"
      },
      {
        id: "feared_places",
        question: "Are there places the hero fears or avoids?",
        placeholder: "Locations with emotional weight...",
        helpText: "Where they don't want to go"
      },
      {
        id: "tension_locations",
        question: "What locations heighten tension?",
        placeholder: "Settings that increase stakes...",
        helpText: "Where things get worse"
      },
      {
        id: "contradictions",
        question: "What places contradict the hero's expectations?",
        placeholder: "Surprising environments...",
        helpText: "Locations that challenge assumptions"
      },
      {
        id: "routine_vs_disruptive",
        question: "Which events are routine vs disruptive?",
        placeholder: "Normal vs. extraordinary moments...",
        helpText: "What breaks the pattern?"
      },
      {
        id: "revealing_disruptions",
        question: "Which disruptions reveal character best?",
        placeholder: "Moments that force truth...",
        helpText: "When masks come off"
      },
    ],
  },
  {
    id: "escalation",
    title: "VIII. ESCALATION",
    description: "Making it worse",
    questions: [
      {
        id: "consequences",
        question: "How do actions lead to unexpected consequences?",
        placeholder: "Ripple effects, backfires...",
        helpText: "The law of unintended consequences"
      },
      {
        id: "miscalculations",
        question: "What miscalculations occur?",
        placeholder: "Errors in judgment...",
        helpText: "Where they get it wrong"
      },
      {
        id: "intensification",
        question: "How does conflict intensify?",
        placeholder: "Rising tension, increasing stakes...",
        helpText: "The tightening vice"
      },
      {
        id: "antagonist_escalation",
        question: "Does the antagonist escalate or adapt?",
        placeholder: "How opposition gets smarter or meaner...",
        helpText: "Evolution of the threat"
      },
      {
        id: "panic",
        question: "Does the hero panic, doubt, regret?",
        placeholder: "Emotional breakdown moments...",
        helpText: "The dark night of the soul"
      },
      {
        id: "reevaluation",
        question: "Do they re-evaluate their beliefs?",
        placeholder: "Paradigm shifts, realizations...",
        helpText: "When worldview cracks"
      },
      {
        id: "injustices",
        question: "What injustices or insults sharpen the conflict?",
        placeholder: "Personal wounds, provocations...",
        helpText: "What makes it personal?"
      },
    ],
  },
  {
    id: "climax",
    title: "IX. CLIMAX & RESOLUTION",
    description: "Inevitable collision",
    questions: [
      {
        id: "inevitable",
        question: "When does the outcome feel inevitable?",
        placeholder: "The point where there's no turning back...",
        helpText: "When fate is sealed"
      },
      {
        id: "confrontation",
        question: "What confrontation is most feared?",
        placeholder: "The ultimate face-off...",
        helpText: "The moment they've been avoiding"
      },
      {
        id: "antagonist_triumph",
        question: "When does the antagonist feel triumphant?",
        placeholder: "Their victory moment...",
        helpText: "Peak of opposition power"
      },
      {
        id: "confess_beg_surrender",
        question: "Does anyone confess, beg, or surrender?",
        placeholder: "Moments of vulnerability or defeat...",
        helpText: "Who breaks first?"
      },
      {
        id: "escape_redeem",
        question: "Does anyone try to escape or redeem themselves?",
        placeholder: "Last-minute choices...",
        helpText: "Final chance for change"
      },
      {
        id: "last_chance",
        question: "Is there a last chance to stop the outcome?",
        placeholder: "The final decision point...",
        helpText: "The choice that determines everything"
      },
    ],
  },
  {
    id: "aftermath",
    title: "X. AFTERMATH",
    description: "Meaning",
    questions: [
      {
        id: "final_lesson",
        question: "What is the last thing the hero learns?",
        placeholder: "Ultimate truth or realization...",
        helpText: "The wisdom earned"
      },
      {
        id: "victory_meaning",
        question: "What does 'victory' actually mean now?",
        placeholder: "How success is redefined...",
        helpText: "Did they win what they thought they wanted?"
      },
      {
        id: "cost",
        question: "What did it cost?",
        placeholder: "Sacrifices, losses...",
        helpText: "The price of the journey"
      },
      {
        id: "audience_feeling",
        question: "What should the audience feel at the end?",
        placeholder: "Catharsis, hope, melancholy, resolve...",
        helpText: "Intended emotional impact"
      },
      {
        id: "lingering_question",
        question: "What question lingers after the credits?",
        placeholder: "The thought that stays with them...",
        helpText: "The lasting resonance"
      },
    ],
  },
];
