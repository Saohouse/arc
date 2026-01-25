# AI Character Generator Setup

## Quick Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your `.env` file:
   ```
   OPENAI_API_KEY="sk-your-key-here"
   ```
3. Restart your development server

## How It Works

### 1. AI Generation Page
Navigate to `/archive/characters/new/ai-generator`

**Enter:**
- Character concept (e.g., "A rebellious space pirate with trust issues")
- Enable cast analysis (optional)
- Choose ensemble goal: Balance, Conflict, Support, Contrast, or Complete

**AI Analyzes:**
- Your existing characters
- Character type gaps (missing antagonist, mentor, etc.)
- Psychology trait imbalances
- Compatibility opportunities

**AI Generates:**
- Full Frank Daniel wizard answers (all 10 sections)
- Suggested psychology traits
- Reasoning for how character balances your cast

### 2. Review in Wizard
After generation, you're redirected to the character wizard with ALL sections pre-filled.

**You can:**
- ✅ Edit any answer in any section
- ✅ Save drafts as you work
- ✅ Complete and create character when ready

### 3. Cast Analysis Example

```
Current Cast Analysis:
- 3 characters total
- Types: protagonist (2), support (1)
- Missing: antagonist, mentor
- Psychology: Empathetic (2), Confident (1), Anxious (1)

AI Suggestion:
"Creating antagonist with Narcissistic + Manipulative traits to:
- Fill missing antagonist role
- Balance high empathy in cast
- Create conflict with protagonist (30% compatibility)"
```

## Usage Tips

**Be specific in your concept:**
- ❌ "A warrior"
- ✅ "A battle-hardened warrior struggling with PTSD who refuses to pick up a sword again"

**Use ensemble goals strategically:**
- **Balance** - First characters in your story
- **Conflict** - Need more tension/drama
- **Support** - Protagonist feels isolated
- **Contrast** - Cast feels too similar
- **Complete** - Missing specific archetype

**After generation:**
- Review the reasoning to understand AI's choices
- Edit sections that don't fit your vision
- Regenerate if needed (future feature)

## Costs

OpenAI API costs approximately:
- $0.03-0.05 per character generation
- Uses GPT-4 for high-quality results
- Only charged when you generate

## Troubleshooting

**"Failed to generate character"**
- Check your OPENAI_API_KEY is valid
- Check API key has credits
- Check console for specific error

**Generated character doesn't fit**
- Try being more specific in your concept
- Edit the answers in the wizard
- Regenerate with different ensemble goal

**Cast analysis seems wrong**
- Ensure existing characters have psychology traits assigned
- Complete Frank Daniel wizard for existing characters for better analysis
