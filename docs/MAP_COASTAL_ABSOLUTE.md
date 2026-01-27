# FINAL FIX: Coastal Cities AT Province Edge! 🌊

## 🎯 The Real Problem

**Issue:** Even at 85px, Saltmere was still inside the province (which extends to 110-120px).

**Root Cause:** We were using multipliers (1.7x) instead of positioning cities at the ACTUAL edge!

---

## 📐 NEW Approach: Absolute Positioning

### Before (Multiplier Approach):
```
Inland city: 50px
Coastal city: 50 * 1.7 = 85px
Province radius: 120px
Result: 85/120 = 71% from center (STILL inland!)
```

### After (Absolute Positioning):
```
Inland city: 50px
Coastal city: 95px (FIXED distance near edge!)
Province radius: 120px
Result: 95/120 = 79% from center (VERY near edge!)
```

**Key Change:** Coastal cities at **fixed 95px**, not multiplier-based!

---

## 🗺️ Province Sizing Updated

**To properly frame coastal cities at 95px:**

```typescript
// Base minimum
maxDistance = 80px

// Calculate based on actual city positions
for each city:
  distance = sqrt(dx² + dy²)
  maxDistance = max(maxDistance, distance + 20px) // Tight padding!

// Cap at 120px
maxDistance = min(maxDistance, 120px)
```

**Result for Stellara with Saltmere at 95px:**
```
maxDistance = max(80, 95 + 20, 120)
            = max(80, 115, 120)
            = 115px

Province extends to ~115px
Saltmere at 95px
Distance from edge = 115 - 95 = 20px only!
```

---

## 🎨 Visual Result

**Before (85px):**
```
Stellara Center (0px)
    |
    | 85px
    ↓
[Saltmere] ← Looks inland
    |
    | 25-35px (too much space!)
    ↓
Province Edge (~110-120px)
    ↓
Ocean 🌊
```

**After (95px):**
```
Stellara Center (0px)
    |
    | 95px
    ↓
      [Saltmere] ← Near edge!
    |
    | 20px (perfect coastal distance!)
    ↓
Province Edge (~115px)
    ↓
Ocean 🌊
```

**Distance from edge:** 25-35px → **20px** = Clearly coastal!

---

## 📊 Complete Positioning Table

| Location | Inland | Coastal | Notes |
|----------|--------|---------|-------|
| **City** | 50px | **95px** | Absolute position! |
| **Province** | 150px | 225px | 50% boost |
| **Town** | 50px | 65px | 30% boost |

**Cities use absolute positioning for maximum coastal effect!**

---

## 🧮 Math

### For Saltmere (coastal city):

**Position calculation:**
```
Parent: Stellara center
Angle: Based on sibling index
Distance: 95px (FIXED for coastal)
X = stellara.x + cos(angle) * 95
Y = stellara.y + sin(angle) * 95
```

**Province sizing:**
```
Saltmere distance from center: 95px
Province radius: 95 + 20 padding = 115px
Gap to edge: 115 - 95 = 20px

Percentage: 95/115 = 82.6% from center!
```

**Comparison to inland:**
```
Inland city: 50/115 = 43.5% from center
Coastal city: 95/115 = 82.6% from center
Difference: 39.1% closer to edge!
```

---

## 🌊 Why 95px Works

### Province size range: 80-120px

**Coastal cities at 95px:**
- If province = 100px: city at 95% from center (5px from edge)
- If province = 110px: city at 86% from center (15px from edge)
- If province = 120px: city at 79% from center (25px from edge)

**Average:** ~20px from edge = **clearly coastal!**

---

## 🎯 Result

**Saltmere now:**
- ✅ Positioned at **fixed 95px** (not 85px multiplier)
- ✅ Province sizes to **~115px** to contain it
- ✅ Only **20px from edge** (not 25-35px)
- ✅ **82.6% from center** (not 71%)
- ✅ **VISIBLY COASTAL** on the map!

---

## 💡 Detection (Reminder)

**For Saltmere to be coastal, add to ANY field:**
- **Tags:** `port`, `coastal`, `harbor`
- **Summary:** "port city"
- **Overview:** "coastal"

**If detected → 95px position!**
**If NOT detected → 50px position!**

**45px difference is VERY obvious!**

---

**Status**: ✅ Fixed absolute positioning at 95px!
**Distance**: 85px → **95px** (near maximum)
**Approach**: Multiplier → **Absolute position**!
**Edge gap**: 25-35px → **20px**!
**Result**: Saltmere FINALLY coastal! 🌊🗺️✨
