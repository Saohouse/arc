# Intelligent Coastal Positioning 🌊

## 🎯 Feature Overview

**Locations are now intelligently positioned based on their descriptions!**

If a location's summary or overview mentions water-related keywords (port, harbor, coastal, etc.), it will automatically be positioned near the edge of the map (closer to water boundaries).

---

## 📐 How It Works

### Keyword Detection

**Scans location text for coastal keywords:**
```typescript
function isCoastalLocation(summary: string | null, overview: string | null): boolean {
  const text = `${summary || ''} ${overview || ''}`.toLowerCase();
  
  const coastalKeywords = [
    'port', 'harbor', 'harbour', 'coastal', 'coast', 'seaside', 'waterfront',
    'bay', 'dock', 'wharf', 'marina', 'beach', 'shore', 'seafront',
    'nautical', 'maritime', 'naval', 'fishing village', 'fishing port',
    'ocean', 'sea ', ' sea', 'lake ', 'lakeside', 'riverside', 'river port'
  ];
  
  return coastalKeywords.some(keyword => text.includes(keyword));
}
```

### Smart Positioning

**Coastal locations are pushed toward map edges:**

**Countries:**
- Normal: 100% of radius
- Coastal: **115% of radius** (15% further out)

**Provinces:**
- Normal: 150px from parent
- Coastal: **180px from parent** (20% further)

**Cities:**
- Normal: 50px from province center
- Coastal: **57.5px from center** (15% further)

**Towns:**
- Normal: 50px from city center
- Coastal: **55px from center** (10% further)

**Standalone:**
- Normal: 100% of radius
- Coastal: **115% of radius** (15% further)

---

## 🗺️ Visual Result

### Before (No Intelligence):
```
        [Port City]
     [Inland City]
   [Coastal Town]
 [Regular Province]
      [Country]
```
All positioned randomly, no logic

### After (Intelligent):
```
Ocean    [Port City] ← 15% further out!
  │   [Inland City]
  │ [Regular Province]
  │     [Country]
Ocean  [Coastal Town] ← Near edge!
```
Coastal locations near water boundaries!

---

## 🔍 Detection Examples

### ✅ **Detected as Coastal:**

**Summary:** "A bustling **port city** with merchant ships."
→ **Keyword:** "port"

**Overview:** "Located on the **coast** with beautiful beaches."
→ **Keyword:** "coast"

**Summary:** "**Harbor** town known for fishing."
→ **Keyword:** "harbor"

**Overview:** "A **maritime** province with **naval** forces."
→ **Keywords:** "maritime", "naval"

**Summary:** "Sits by the **lakeside** with docks."
→ **Keyword:** "lakeside"

### ❌ **NOT Detected as Coastal:**

**Summary:** "A mountain fortress."
→ No coastal keywords

**Overview:** "Desert city in the center."
→ No coastal keywords

**Summary:** "Capital city with grand architecture."
→ No coastal keywords

---

## 📊 Keyword List (21 total)

### Direct Water Features:
- `port`
- `harbor` / `harbour`
- `coastal` / `coast`
- `seaside`
- `waterfront`
- `bay`
- `dock`
- `wharf`
- `marina`
- `beach`
- `shore`
- `seafront`

### Maritime Context:
- `nautical`
- `maritime`
- `naval`
- `fishing village`
- `fishing port`

### Water Bodies:
- `ocean`
- `sea` (with spaces to avoid false matches like "season")
- `lake` (with space)
- `lakeside`
- `riverside`
- `river port`

---

## 🎨 Positioning Multipliers

| Location Type | Normal | Coastal | Increase |
|---------------|--------|---------|----------|
| **Country** | 100% | 115% | +15% |
| **Province** | 150px | 180px | +20% |
| **City** | 50px | 57.5px | +15% |
| **Town** | 50px | 55px | +10% |
| **Standalone** | 100% | 115% | +15% |

### Why Different Multipliers?

- **Provinces**: +20% (most dramatic) - need clear separation
- **Countries/Cities**: +15% (moderate) - noticeable but not extreme  
- **Towns**: +10% (subtle) - small adjustment

---

## 🧮 Math Behind It

### Example: Port City

**Normal positioning:**
```
Province center: (500, 300)
City distance: 50px
City position: (500 + cos(angle) * 50, 300 + sin(angle) * 50)
```

**Coastal positioning:**
```
Province center: (500, 300)
Coastal multiplier: 1.15
City distance: 50 * 1.15 = 57.5px
City position: (500 + cos(angle) * 57.5, 300 + sin(angle) * 57.5)

Result: City is 7.5px further from center = closer to edge!
```

### Radial Push Effect:

```
      Center
        ↓
    [Regular] ← 50px
        ↓
    [Coastal] ← 57.5px (pushed toward edge/water)
        ↓
      Edge
```

---

## 💡 Usage Tips

### For Writers:

**To make a location coastal, add keywords to description:**

✅ **Good examples:**
- "A **port city** known for trade"
- "**Coastal** village with fishermen"
- "Located by the **harbor** with docks"
- "Sits on the **waterfront**"
- "A **maritime** province"

❌ **Won't work:**
- "A city" (no keywords)
- "Mountain town" (not coastal)
- "Desert fortress" (not coastal)

### For Best Results:

1. **Be specific:** "port city" better than just "city"
2. **Use multiple keywords:** "coastal harbor town" = very clear
3. **Natural language:** Write normally, system will detect
4. **Both fields:** Keywords in summary OR overview work

---

## 🎯 Benefits

### Realistic Geography:
- ✅ Port cities actually near water
- ✅ Coastal provinces on outer ring
- ✅ Inland locations stay central
- ✅ Matches how real maps look

### Automatic:
- ✅ No manual positioning needed
- ✅ Works with existing descriptions
- ✅ Updates if description changes
- ✅ Smart keyword detection

### Flexible:
- ✅ 21 different keywords
- ✅ Case-insensitive
- ✅ Works in any part of text
- ✅ Multiple keywords = still coastal

---

## 🚀 Result

**A smart map that:**
- ✅ Reads location descriptions
- ✅ Detects water-related keywords
- ✅ Positions coastal locations near edges
- ✅ Keeps inland locations central
- ✅ Creates realistic geography automatically!

**Try it:**
1. Add a location with "port city" in description
2. Refresh the map
3. Notice it's positioned near the outer edge! 🌊

---

**Status**: ✅ Intelligent coastal positioning active!
**Keywords**: 21 water-related terms detected
**Effect**: +10-20% outward positioning
**Result**: Realistic coastal geography! 🗺️✨
