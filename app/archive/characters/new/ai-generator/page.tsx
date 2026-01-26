"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, RefreshCw } from "lucide-react";

type EnsembleGoal = 
  | "balance"
  | "conflict"
  | "support"
  | "contrast"
  | "complete";

const ENSEMBLE_GOALS: Record<EnsembleGoal, { label: string; description: string }> = {
  balance: {
    label: "Balance the Cast",
    description: "Fill gaps and create a well-rounded ensemble",
  },
  conflict: {
    label: "Create Conflict",
    description: "Add tension and challenge existing characters",
  },
  support: {
    label: "Add Support",
    description: "Complement and assist the protagonist",
  },
  contrast: {
    label: "Shake Things Up",
    description: "Bring a fresh perspective that contrasts with everyone",
  },
  complete: {
    label: "Complete the Team",
    description: "Fill a missing archetype or role",
  },
};

export default function AIGeneratorPage() {
  const router = useRouter();
  const [concept, setConcept] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [ensembleGoal, setEnsembleGoal] = useState<EnsembleGoal>("balance");
  const [analyzeCast, setAnalyzeCast] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!concept.trim()) {
      setError("Please enter a character concept");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/ai/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.trim(),
          characterName: characterName.trim() || undefined,
          ensembleGoal: ENSEMBLE_GOALS[ensembleGoal].label,
          analyzeCast,
          autoCreate: false, // Always go to wizard
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate character");
      }

      const { character, castAnalysis } = await response.json();

      // Store generated data for wizard review
      localStorage.setItem(
        "ai-generated-character",
        JSON.stringify({
          name: character.name,
          bio: character.bio,
          psychologyTraits: character.psychologyTraits,
          wizardData: character.wizardData,
          reasoning: character.reasoning,
          castAnalysis,
        })
      );

      // Always redirect to wizard for review & image upload
      router.push("/archive/characters/new/wizard?ai=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/archive/characters/new"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to character creation
        </Link>

        <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold mb-2">AI Character Generator</h1>
              <p className="text-sm text-muted-foreground">
                Describe your character idea and let AI create a fully developed character using the
                Frank Daniel Method. You'll be able to review and edit everything before saving.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Character Name (Optional) */}
          <div className="rounded-lg border p-6 bg-card">
            <label className="block text-sm font-semibold mb-3">
              Character Name (Optional)
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="e.g., Marcus Steel, Dr. Chen, The Wanderer..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to let AI generate a fitting name based on the character concept.
            </p>
          </div>

          {/* Character Concept */}
          <div className="rounded-lg border p-6 bg-card">
            <label className="block text-sm font-semibold mb-3">
              Character Concept *
            </label>
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., A rebellious space pirate haunted by a betrayal from their former crew. Confident on the outside but struggles with trust issues..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            />
            <p className="text-xs text-muted-foreground mt-2">
              The more detail you provide, the better the AI can develop your character.
            </p>
          </div>

          {/* Cast Analysis Toggle */}
          <div className="rounded-lg border p-6 bg-card">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analyzeCast}
                onChange={(e) => setAnalyzeCast(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">Analyze Existing Cast</div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will review your existing characters and create someone who balances your
                  ensemble, fills gaps, or creates interesting dynamics.
                </p>
              </div>
            </label>
          </div>

          {/* Ensemble Goal */}
          {analyzeCast && (
            <div className="rounded-lg border p-6 bg-card">
              <label className="block text-sm font-semibold mb-3">
                Ensemble Goal
              </label>
              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(ENSEMBLE_GOALS) as EnsembleGoal[]).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setEnsembleGoal(goal)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      ensembleGoal === goal
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium mb-1">{ENSEMBLE_GOALS[goal].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {ENSEMBLE_GOALS[goal].description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !concept.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Character...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Character
                </>
              )}
            </button>
            
            <Link
              href="/archive/characters/new"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>

          {/* Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">
              💡 <strong>What happens next:</strong> AI will generate a fully developed character with bio, psychology traits, and answers to all Frank Daniel questions. You'll then review everything in the character wizard where you can upload an image, edit details, and save when ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
