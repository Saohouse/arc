# Button Quick Reference Guide

## Copy-Paste Ready Button Styles

Use these exact class strings for consistent button styling across the entire application.

### Primary Action Button (Black/Filled)
```tsx
className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
```
**Use for:** Main actions like "New character", "Create", "Save", "Submit"

---

### Secondary Action Button (White/Outline)
```tsx
className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
```
**Use for:** Secondary actions like "Cancel", "View", "Sagas", navigation buttons

---

### Small Secondary Button (Compact)
```tsx
className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all touch-manipulation whitespace-nowrap"
```
**Use for:** Toggles like "Hide Photos", "Show Details", compact actions

---

### Danger/Delete Button
```tsx
className="inline-flex items-center justify-center rounded-lg border border-border px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-foreground/70 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 dark:hover:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 transition-all touch-manipulation whitespace-nowrap"
```
**Use for:** Destructive actions like "Delete", "Remove"

---

### Branded/Special Button (e.g., Purple themed)
```tsx
className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-400 dark:hover:border-purple-600 hover:scale-[1.02] hover:shadow-md transition-all text-sm touch-manipulation whitespace-nowrap"
```
**Use for:** Special themed actions, brand-specific CTAs

---

## Key Hover Effects Explained

All buttons use a combination of effects for noticeable, polished interactions:

1. **`hover:scale-[1.02]`** - 2% scale increase (subtle lift)
2. **`hover:shadow-lg` or `hover:shadow-md`** - Shadow for depth
   - `shadow-lg` for primary buttons (larger shadow)
   - `shadow-md` for secondary buttons (medium shadow)
3. **`hover:bg-*`** - Background color change
4. **`hover:border-*`** - Border color intensifies
5. **`transition-all`** - Smooth animation of ALL properties

---

## Visual Hierarchy

```
Primary (Black)    →  shadow-lg  →  Most prominent
Secondary (Outline) →  shadow-md  →  Medium prominence  
Small/Compact      →  shadow-md  →  Subtle but clear
```

---

## Mobile Optimization

All buttons include:
- ✅ `touch-manipulation` - Prevents 300ms tap delay
- ✅ `whitespace-nowrap` - No awkward text wrapping
- ✅ Minimum 44x44px touch target (via padding)
- ✅ `inline-flex items-center justify-center` - Perfect centering

---

## Anti-Patterns ❌

**DON'T use these anymore:**
- ❌ `transition-colors` (use `transition-all`)
- ❌ `rounded` or `rounded-md` (use `rounded-lg`)
- ❌ `text-[13px]` (use `text-sm` or `text-xs`)
- ❌ Missing hover scale/shadow effects
- ❌ Plain `hover:bg-muted` without border/shadow

**DO use:**
- ✅ Copy exact strings from this guide
- ✅ Include all hover effects (scale + shadow + color)
- ✅ Use semantic sizing (`text-sm`, `text-xs`)
- ✅ Include touch optimization classes

---

## Examples in Context

### Page Header with Primary + Secondary
```tsx
<div className="flex gap-2">
  <Link href="/sagas" className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation">
    📚 Sagas
  </Link>
  <Link href="/episodes/new" className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation">
    + New Episode
  </Link>
</div>
```

### Form Actions
```tsx
<div className="flex justify-end gap-3">
  <Link href="/characters" className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation">
    Cancel
  </Link>
  <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation">
    Save Character
  </button>
</div>
```

---

## When to Use Which Button

| Action Type | Button Style | Example |
|------------|-------------|---------|
| Create new item | Primary | "New character", "Create tag" |
| Save/Submit | Primary | "Save", "Submit", "Create" |
| Navigate to section | Secondary | "Sagas", "View all", "Back" |
| Toggle view | Small Secondary | "Hide Photos", "Show Details" |
| Cancel action | Secondary | "Cancel", "Back to list" |
| Delete/Remove | Danger | "Delete", "Remove member" |
| Special feature | Branded | "Complete Wizard", "Generate AI" |

---

## Testing Checklist

Before deploying new buttons:
- [ ] Hover effect is clearly visible
- [ ] Button doesn't wrap text awkwardly on mobile
- [ ] Touch target feels responsive (no delay)
- [ ] Scale animation is smooth (not jarring)
- [ ] Shadow appears on hover
- [ ] Visual hierarchy is clear (primary vs secondary)
- [ ] Works in both light and dark mode

---

**Last Updated:** January 2026
**Design System Version:** 1.0
