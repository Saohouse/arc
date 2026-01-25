import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireRole } from "@/lib/auth";
import { requireStory } from "@/lib/story";
import { prisma } from "@/lib/prisma";
import { FRANK_DANIEL_SECTIONS } from "@/lib/frank-daniel-questions";
import { PSYCHOLOGY_TRAITS, getTraitById } from "@/lib/psychology-traits";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    await requireRole("editor");
    const currentStory = await requireStory();

    const body = await request.json();
    const { concept, ensembleGoal, analyzeCast, autoCreate } = body;

    if (!concept || typeof concept !== "string") {
      return NextResponse.json(
        { error: "Character concept is required" },
        { status: 400 }
      );
    }

    // Fetch existing characters if cast analysis is enabled
    let castAnalysis = null;
    let existingCharacters: any[] = [];

    if (analyzeCast) {
      existingCharacters = await prisma.character.findMany({
        where: { storyId: currentStory.id },
        select: {
          name: true,
          wizardData: true,
          psychologyTraits: true,
        },
      });

      // Analyze cast
      const characterTypes = new Map<string, number>();
      const psychologyTraitCounts = new Map<string, number>();

      existingCharacters.forEach((char) => {
        // Count character types from wizard data
        if (char.wizardData && typeof char.wizardData === "object") {
          const data = char.wizardData as Record<string, string>;
          const type = data["character_type_type"];
          if (type) {
            characterTypes.set(type, (characterTypes.get(type) || 0) + 1);
          }
        }

        // Count psychology traits
        if (char.psychologyTraits) {
          const traits = char.psychologyTraits.split(",").filter(Boolean);
          traits.forEach((traitId) => {
            const trait = getTraitById(traitId);
            if (trait) {
              psychologyTraitCounts.set(
                trait.name,
                (psychologyTraitCounts.get(trait.name) || 0) + 1
              );
            }
          });
        }
      });

      castAnalysis = {
        totalCharacters: existingCharacters.length,
        characterTypes: Object.fromEntries(characterTypes),
        psychologyTraits: Object.fromEntries(psychologyTraitCounts),
        missingTypes: [
          "protagonist",
          "antagonist",
          "mentor",
          "support",
          "love_interest",
        ].filter((type) => !characterTypes.has(type)),
      };
    }

    // Build prompt for OpenAI
    const systemPrompt = `You are an expert character developer using the Frank Daniel Method, a systematic approach to character development used at top film schools. You help writers create deeply developed characters with clear motivations, conflicts, and arcs.

Your task is to generate comprehensive character development answers based on the user's concept and ensemble needs.

IMPORTANT: Return a JSON object with this EXACT structure:
{
  "name": "Character Name",
  "psychologyTraits": ["trait-id-1", "trait-id-2"],
  "wizardData": {
    "character_type_type": "protagonist",
    "character_type_type_notes": "...",
    "core_identity_who": "...",
    "core_identity_why_care": "...",
    // ... all other sections
  },
  "reasoning": "Brief explanation of how this character balances the cast"
}

Available psychology trait IDs: ${PSYCHOLOGY_TRAITS.map((t) => t.id).join(", ")}

Frank Daniel sections to fill:
${FRANK_DANIEL_SECTIONS.map((s) => `- ${s.id}: ${s.questions.map((q) => q.id).join(", ")}`).join("\n")}`;

    const userPrompt = `Character Concept: ${concept}

${ensembleGoal ? `Ensemble Goal: ${ensembleGoal}` : ""}

${
  castAnalysis
    ? `
Current Cast Analysis:
- Total characters: ${castAnalysis.totalCharacters}
- Character types present: ${Object.entries(castAnalysis.characterTypes)
        .map(([type, count]) => `${type} (${count})`)
        .join(", ")}
- Missing types: ${castAnalysis.missingTypes.join(", ")}
- Psychology traits: ${Object.entries(castAnalysis.psychologyTraits)
        .map(([trait, count]) => `${trait} (${count})`)
        .join(", ")}

Please design a character that fills gaps and ${ensembleGoal || "balances the cast"}.
`
    : ""
}

Generate a fully developed character following the Frank Daniel Method. Provide thoughtful, specific answers to each question. The character should feel real, complex, and serve a clear narrative purpose.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    const generatedCharacter = JSON.parse(result);

    // If autoCreate is enabled, create the character in the database
    let characterId = null;
    if (autoCreate) {
      // Get the highest order value
      const maxOrder = await prisma.character.findFirst({
        where: { storyId: currentStory.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (maxOrder?.order ?? -1) + 1;

      // Create the character
      const createdCharacter = await prisma.character.create({
        data: {
          name: generatedCharacter.name,
          storyId: currentStory.id,
          wizardData: generatedCharacter.wizardData,
          psychologyTraits: Array.isArray(generatedCharacter.psychologyTraits)
            ? generatedCharacter.psychologyTraits.join(",")
            : String(generatedCharacter.psychologyTraits || ""),
          order: newOrder,
        },
      });

      characterId = createdCharacter.id;
    }

    return NextResponse.json({
      character: generatedCharacter,
      castAnalysis,
      characterId,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate character" },
      { status: 500 }
    );
  }
}
