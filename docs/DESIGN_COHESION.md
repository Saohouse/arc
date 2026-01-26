# Design Cohesion Guide

This document outlines the subtle design enhancements made across the ARC application to create visual consistency without sacrificing functionality.

## Design Philosophy

**Goal**: Create cohesion through subtle patterns, not forced uniformity.

- Hub/overview pages use enhanced visual design with gradients
- List/browse pages prioritize scanability and efficiency
- Detail pages focus on content clarity
- Form pages emphasize functional simplicity

---

## Visual Elements

### 1. **Gradient Numbers**
Used for statistics and metrics on overview pages:

```css
/* Pattern */
bg-gradient-to-br from-{color}-600 to-{color}-400 
dark:from-{color}-400 dark:to-{color}-600 
bg-clip-text text-transparent
```

**Color Coding by Category:**
- **Blue** (`from-blue-600 to-blue-400`) - Characters
- **Purple** (`from-purple-600 to-purple-400`) - Worlds/Data Health
- **Emerald** (`from-emerald-600 to-emerald-400`) - Locations/Descriptions
- **Amber** (`from-amber-600 to-amber-400`) - Objects/Tags
- **Gray** (`from-gray-600 to-gray-400`) - Neutral/Drafts

### 2. **Card Enhanced Class**
The `.card-enhanced` class provides glassmorphism effect:

```tsx
className="card-enhanced p-6 sm:p-8"
```

**When to Use:**
- ✅ Stats cards on overview pages
- ✅ Important list items (episodes, relationships)
- ✅ Feature sections (health scores)
- ❌ Dense data tables
- ❌ Form inputs
- ❌ Simple text containers

### 3. **Hover Effects**
Consistent subtle hover transforms:

```tsx
// For cards
hover:scale-[1.01] transition-transform

// For stats cards
hover:scale-[1.02] transition-transform

// For timeline cards
hover:scale-105 transition-transform
```

---

## Typography System

### Heading Hierarchy
```tsx
// Page Titles (H1)
className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight"

// Section Titles (H2)
className="text-xl sm:text-2xl font-semibold tracking-tight"

// Descriptions
className="text-sm sm:text-base text-muted-foreground tracking-tight"

// Stats Labels
className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium"
```

### Number Display
```tsx
// Large Stats
className="text-3xl sm:text-4xl font-bold tracking-tight"

// With gradient (see above)
```

---

## Spacing System

### Page Layout
```tsx
// Main container
<div className="space-y-8 sm:space-y-12">

// Sections
<div className="space-y-2 sm:space-y-3"> // Headers
<div className="space-y-3"> // Lists
<div className="space-y-6 sm:space-y-8"> // Major sections
```

### Grid Gaps
```tsx
// Stats grids
grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4

// Content grids
grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

---

## Page-by-Page Implementation

### ✅ **Home Page** (`app/page.tsx`)
- Large gradient numbers in square stat cards
- Color-coded by category (blue/purple/emerald/amber)
- `card-enhanced` for stats and activity items
- Hero section with responsive typography

### ✅ **Archive Page** (`app/archive/page.tsx`)
- Large gradient numbers showing entity counts
- Enhanced cards with descriptions
- Hover scale effect (`hover:scale-[1.02]`)
- Dynamic data from database

### ✅ **Episodes Page** (`app/episodes/page.tsx`)
- Gradient stat cards (Total/Published/Review/Drafts)
- Color-coded: blue → emerald → amber → gray
- Episode list items use `card-enhanced`
- Enhanced typography hierarchy

### ✅ **Timeline Page** (`app/timeline/page.tsx`)
- Episode cards use `card-enhanced`
- Strong hover effect (`hover:scale-105`) for cards
- Maintains horizontal scrolling functionality
- Consistent header styling

### ✅ **Relationships Page** (`app/relationships/page.tsx`)
- Relationship list items use `card-enhanced`
- Subtle hover (`hover:scale-[1.01]`)
- Enhanced header spacing
- Typography consistency

### ✅ **Continuity Page** (`app/continuity/page.tsx`)
- Health score section uses `card-enhanced`
- Gradient percentages: blue/purple/emerald/amber
- Issues summary with color-coded totals
- Stats use consistent gradient pattern

### ✅ **Tags Page** (`app/tags/page.tsx`)
- Gradient stat cards (Total/Custom/Unused)
- Color-coded: blue → purple → gray
- Mobile-responsive table → card layout
- Enhanced header spacing

---

## Mobile Optimization

All pages follow these responsive patterns:

### Headers
```tsx
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
  <div className="flex-1">
    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">...</h1>
    <p className="text-sm sm:text-base text-muted-foreground mt-2 tracking-tight">...</p>
  </div>
  {/* Actions */}
</div>
```

### Stat Cards
```tsx
<div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
  <div className="card-enhanced p-6 space-y-1">
    <div className="text-3xl sm:text-4xl font-bold tracking-tight [gradient]">
      {number}
    </div>
    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
      Label
    </div>
  </div>
</div>
```

### Empty States
```tsx
<div className="rounded-lg border border-dashed p-8 sm:p-12 text-center text-sm text-muted-foreground">
  Message
</div>
```

---

## Consistency Checklist

When creating or updating a page, ensure:

- [ ] **Headings** use responsive sizing and `tracking-tight`
- [ ] **Descriptions** use `text-muted-foreground` and `tracking-tight`
- [ ] **Stats cards** (if applicable) use gradients and `card-enhanced`
- [ ] **List items** use `card-enhanced` with subtle hover
- [ ] **Spacing** follows the system (`space-y-8 sm:space-y-12`)
- [ ] **Empty states** have generous padding (`p-8 sm:p-12`)
- [ ] **Buttons** follow design system (see `BUTTON_REFERENCE.md`)
- [ ] **Color coding** matches category (blue/purple/emerald/amber)
- [ ] **Mobile responsive** with appropriate breakpoints

---

## Anti-Patterns to Avoid

❌ **Don't:**
- Use gradient numbers on dense data tables
- Apply `card-enhanced` to every card (only important ones)
- Mix different hover effect strengths on the same page
- Create different spacing systems
- Use gradients for body text or labels
- Force the same layout on functional pages (forms, editors)

✅ **Do:**
- Use gradients for metrics and stats
- Apply `card-enhanced` to featured content
- Keep hover effects subtle and consistent
- Follow the spacing system
- Use gradients for numbers and display text
- Adapt layout to the page's purpose

---

## Future Enhancements

When adding new pages:
1. Identify page type (hub/list/detail/form)
2. Use appropriate patterns from this guide
3. Follow color coding for categories
4. Test mobile responsiveness
5. Update this document if new patterns emerge
