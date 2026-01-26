# ARC Design System

## Button Standards

All buttons across the application now follow a consistent design system for cohesive UX.

### Primary Action Buttons

Used for main actions like "New character", "New episode", "Create", etc.

```tsx
className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 hover:scale-[1.02] hover:shadow-lg transition-all whitespace-nowrap touch-manipulation"
```

**Properties:**
- `inline-flex items-center justify-center` - Proper flexbox centering
- `rounded-lg` - Consistent 8px border radius
- `bg-foreground` - Black background (adapts to theme)
- `px-5 py-2.5` - Standard padding (20px horizontal, 10px vertical)
- `text-sm font-medium` - 14px font size, medium weight
- `text-background` - White text (adapts to theme)
- `hover:bg-foreground/90` - 90% opacity on hover
- `hover:scale-[1.02]` - Subtle scale up (2%) on hover
- `hover:shadow-lg` - Adds shadow on hover for depth
- `transition-all` - Smooth transitions for all properties
- `whitespace-nowrap` - Prevents text wrapping
- `touch-manipulation` - Optimized for touch devices

### Secondary/Outline Buttons

Used for secondary actions like "Sagas", "New Arc", etc.

```tsx
className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted hover:border-foreground/30 hover:scale-[1.02] hover:shadow-md transition-all whitespace-nowrap touch-manipulation"
```

**Properties:**
- Same as primary but with:
- `border` - Border instead of filled background
- `px-4 py-2` - Slightly smaller padding for visual hierarchy
- `hover:bg-muted` - Subtle background on hover
- `hover:border-foreground/30` - Border darkens on hover
- `hover:scale-[1.02]` - Subtle scale up (2%) on hover
- `hover:shadow-md` - Medium shadow on hover (less than primary)
- `transition-all` - Smooth transitions for all properties

### Delete/Danger Buttons

Used for destructive actions.

```tsx
className="inline-flex items-center justify-center rounded-lg border border-border px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-foreground/70 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 dark:hover:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 transition-all touch-manipulation whitespace-nowrap"
```

## Page Header Layout

All page headers follow a consistent mobile-responsive layout.

### Standard Header Pattern

```tsx
<div className="space-y-6">
  {/* Header Section - Mobile Optimized */}
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl font-semibold">📚 Page Title</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Page description here.
        </p>
      </div>
      <div className="flex-shrink-0">
        {actionButton}
      </div>
    </div>
  </div>
  
  {/* Rest of page content */}
</div>
```

### With Breadcrumb

```tsx
<div className="space-y-4">
  <div className="text-sm text-muted-foreground">
    Archive / Section
  </div>
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
    {/* ... header content ... */}
  </div>
</div>
```

### Key Features:
- **Mobile-first**: Stacks vertically on mobile (`flex-col`)
- **Responsive**: Side-by-side on tablet+ (`sm:flex-row`)
- **Proper spacing**: `gap-4` ensures consistent gaps
- **Flexible sizing**: Title area grows, button shrinks (`flex-1` and `flex-shrink-0`)
- **Responsive text**: `text-2xl sm:text-3xl` scales on larger screens

## Typography

### Headings

```css
h1: text-2xl sm:text-3xl font-semibold  /* 24px -> 30px */
h2: text-xl font-semibold               /* 20px */
h3: text-lg font-semibold               /* 18px */
```

### Body Text

```css
Base: text-sm                           /* 14px */
Muted: text-sm text-muted-foreground    /* 14px, 70% opacity */
Label: text-xs                          /* 12px */
```

## Spacing

### Container Spacing

```css
Page container: space-y-6               /* 24px vertical gap */
Section spacing: space-y-4              /* 16px vertical gap */
Card spacing: space-y-3                 /* 12px vertical gap */
```

### Padding

```css
Main content: px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10
Card/Border: p-4 (16px all around)
Button: px-5 py-2.5 (20px h, 10px v)
```

## Touch Targets

All interactive elements meet iOS/Android minimum touch target guidelines:

- **Minimum size**: 44x44px (iOS standard)
- **Class**: `.touch-manipulation` - Prevents 300ms tap delay
- **Padding**: Minimum `py-2.5` (10px) for adequate tap area

## Color System

### Primary Colors

```css
Background: bg-background               /* Adapts to light/dark mode */
Foreground: bg-foreground               /* Adapts to light/dark mode */
Muted: bg-muted                         /* Subtle backgrounds */
Border: border-border                   /* Consistent borders */
```

### State Colors

```css
Success: emerald-500, green-500
Warning: amber-500, yellow-500
Error: red-500, rose-500
Info: blue-500, cyan-500
```

### Character Type Gradients

Each character type has a themed gradient for visual distinction:

```tsx
protagonist: "from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950/20"
antagonist: "from-red-50 via-orange-50 to-red-100 dark:from-red-950/20"
mentor: "from-purple-50 via-indigo-50 to-purple-100 dark:from-purple-950/20"
support: "from-green-50 via-emerald-50 to-green-100 dark:from-green-950/20"
love_interest: "from-pink-50 via-rose-50 to-pink-100 dark:from-pink-950/20"
other: "from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-950/20"
```

## Glassmorphism

### Strong Glass (Sidebars, Headers)

```css
.glass-strong {
  backdrop-filter: blur(60px);
  background-color: rgba(255, 255, 255, 0.98);  /* Light mode */
  background-color: rgba(15, 15, 20, 0.95);     /* Dark mode */
}
```

### Light Glass (Overlays)

```css
.glass {
  backdrop-filter: blur(40px);
  background-color: rgba(255, 255, 255, 0.7);   /* Light mode */
  background-color: rgba(0, 0, 0, 0.4);         /* Dark mode */
}
```

## Responsive Breakpoints

Following Tailwind's default breakpoints:

```css
sm:  640px  /* Small tablets, large phones landscape */
md:  768px  /* Tablets */
lg:  1024px /* Laptops (sidebar appears) */
xl:  1280px /* Desktops */
2xl: 1536px /* Large desktops */
```

## Mobile Optimizations

### Key Classes for Mobile

```css
/* Prevent text wrapping */
whitespace-nowrap

/* Better touch handling */
touch-manipulation

/* Responsive padding */
px-4 sm:px-6 lg:px-10

/* Responsive text sizes */
text-2xl sm:text-3xl

/* Responsive layouts */
flex-col sm:flex-row

/* Safe area support */
safe-area-inset-top
```

### Mobile-Specific Considerations

1. **Input font size**: Always 16px+ to prevent iOS zoom
2. **Touch targets**: Minimum 44x44px
3. **Tap highlight**: Disabled with `-webkit-tap-highlight-color: transparent`
4. **Text adjustment**: Prevented with `-webkit-text-size-adjust: 100%`
5. **Smooth scrolling**: `-webkit-overflow-scrolling: touch`

## Implementation Checklist

When adding a new page or component:

- [ ] Use standard button classes (not `text-[13px]` or `rounded`)
- [ ] Use responsive header layout (stacking on mobile)
- [ ] Include `touch-manipulation` on all interactive elements
- [ ] Use `text-sm` for consistent font sizing
- [ ] Ensure 44x44px minimum touch targets
- [ ] Test on mobile (use Chrome DevTools device mode)
- [ ] Verify glassmorphism consistency
- [ ] Check spacing follows the system (space-y-6 for pages, etc.)

## Pages Updated

All pages now follow this design system:

✅ Archive (root)
✅ Characters
✅ Worlds
✅ Locations
✅ Objects
✅ Episodes
✅ Timeline
✅ Relationships
✅ Tags

## Common Anti-Patterns to Avoid

❌ **Don't use:**
- `text-[13px]` - Use `text-sm` instead
- `rounded` - Use `rounded-lg` instead
- `rounded-md` - Use `rounded-lg` instead
- `px-4 py-2` on primary buttons - Use `px-5 py-2.5`
- `flex-wrap` on headers - Use `flex-col sm:flex-row`
- Inline style values for common patterns

✅ **Do use:**
- Design system classes from this document
- Semantic color names (`bg-foreground` not `bg-black`)
- Mobile-first responsive design
- Touch-optimized interaction classes
