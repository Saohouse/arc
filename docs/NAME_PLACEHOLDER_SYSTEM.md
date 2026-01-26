# Name Placeholder System

## Overview

The character wizard now uses a **template placeholder system** instead of find-and-replace for character names. This makes name changes instant, reliable, and visible.

## How It Works

### The `{{name}}` Placeholder

Instead of using the actual character name in wizard answers, we use `{{name}}` as a dynamic placeholder:

**Before (old system):**
```
"John Smith is a former composer who turned against music..."
```

**Now (new system):**
```
"{{name}} is a former composer who turned against music..."
```

### Benefits

1. **Instant Updates** - Change the name once, updates everywhere automatically
2. **No Broken Replacements** - No regex issues, no partial matches, no confusion
3. **Visual Feedback** - Placeholders are highlighted in blue so you know they're dynamic
4. **Works Everywhere** - Character detail page, wizard, edit mode - all update together

## For Users

### In the Wizard

1. **Name Field** - Type the character's name at the top
2. **Highlighted Text** - The name appears highlighted in blue throughout the answers
3. **Instant Preview** - Change the name and see it update in real-time
4. **Manual Use** - You can also type `{{name}}` yourself in any answer

### In Character Details

- When viewing a character, any `{{name}}` placeholder shows the character's actual name
- Highlighted in blue to indicate it's dynamic
- Change the name in edit mode → automatically updates all wizard answers

## For Developers

### AI Generation

The OpenAI prompt now instructs the AI to use `{{name}}` instead of actual names:

```typescript
"{{name}} is a former composer..." // ✓ Correct
"John is a former composer..."      // ✗ Wrong
```

### Display Components

**CharacterWizard.tsx:**
- `renderWithHighlightedPlaceholders()` - Shows name with blue highlight
- Preview box appears above textareas that contain `{{name}}`

**WizardDataDisplay.tsx:**
- Also uses `renderWithHighlightedPlaceholders()`
- Receives `characterName` prop to replace placeholders

### Storage

- Wizard data is stored with `{{name}}` placeholders intact
- Character name is stored separately in the `name` field
- When displayed, placeholders are replaced with the actual name

## Migration

### Existing Characters

Old characters with hardcoded names in their wizard data will still work, but won't have the dynamic name feature. Users can:

1. Manually edit answers and add `{{name}}` where appropriate, OR
2. Generate a new character with AI (which will use placeholders automatically)

### Future Enhancements

- Add a "Convert to Placeholders" button to automatically detect and replace names
- Support for additional placeholders: `{{age}}`, `{{location}}`, etc.
- Highlight different placeholder types in different colors

## Technical Implementation

### Regex Pattern

```javascript
/(\{\{name\}\})/gi  // Case-insensitive, matches {{name}}, {{NAME}}, {{Name}}
```

### React Rendering

```jsx
const renderWithHighlightedPlaceholders = (text: string) => {
  const parts = text.split(/(\{\{name\}\})/gi);
  return parts.map((part, idx) => {
    if (part.toLowerCase() === '{{name}}') {
      return (
        <span className="bg-blue-100 text-blue-800 px-1 rounded">
          {characterName || '{{name}}'}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};
```

## Files Modified

1. **app/api/ai/generate-character/route.ts** - AI prompt updated
2. **components/arc/CharacterWizard.tsx** - Added placeholder rendering
3. **components/arc/WizardDataDisplay.tsx** - Added placeholder rendering
4. **app/archive/characters/[id]/page.tsx** - Pass characterName prop

## Testing

To test the system:

1. Generate a new character with AI
2. Check that answers contain `{{name}}` (not actual names)
3. View the character - name should be highlighted in blue
4. Edit the character's name
5. Verify all wizard answers update automatically
6. Check the wizard page shows preview boxes with highlighted names
