# Map Features Implementation Plan

## ✅ Database Ready
All map visualization fields are live in production database:
- `mapX`, `mapY` - Position coordinates
- `mapZoom` - Hierarchy level (0=world, 1=country, 2=province, 3=city)
- `iconType` - Type of icon ('emoji', 'svg-ref', 'svg-inline', 'custom-upload', 'ai-generated')
- `iconData` - Icon data (emoji char, svg ref, or URL)

## Phase 1: Icon System (Start Here)
### Default Icons by Location Type
```typescript
country → 🌍
province → 🏛️
city → 🏙️
town → 🏘️
```

### Icon Picker Component
- Emoji selector (default)
- Custom upload option
- Preview in forms

## Phase 2: Enhanced Map Component
### Features to Add:
1. **Hierarchical Zoom Levels**
   - Level 0: Show only countries
   - Level 1: Show provinces in selected country
   - Level 2: Show cities in selected province
   - Level 3: Show towns/districts in selected city

2. **Draggable Locations**
   - Click and drag to reposition
   - Auto-save positions to database
   - "Reset Layout" button

3. **Visual Improvements**
   - Replace circles with actual icons
   - Styled connections (roads, paths)
   - Better hover states
   - Breadcrumb navigation

## Phase 3: Connection Styling
- Different road types (highway, path, river, trade route)
- SVG patterns for roads
- Animated connections

## Phase 4: Custom Map Upload
- Upload background image
- Position locations on custom map
- Scale/zoom background with map

## Phase 5: AI Generation (Future)
- Generate location images with DALL-E
- Auto-generate map layouts
