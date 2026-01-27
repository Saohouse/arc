/**
 * Map Generation Utilities
 * Procedural generation for beautiful hierarchical maps
 */

export type Point = { x: number; y: number };

/**
 * Generate a random organic shape (polygon) around a center point
 * Creates irregular, country-like borders (not circular)
 */
export function generateOrganicShape(
  centerX: number,
  centerY: number,
  baseRadius: number,
  sides: number = 8,
  randomness: number = 0.3,
  seed: number = 0
): Point[] {
  const points: Point[] = [];
  const angleStep = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i++) {
    // Add randomness to BOTH angle and radius for irregular shapes
    const angleVariation = (seededRandom(seed + i * 100) - 0.5) * randomness * 0.8;
    const angle = angleStep * i + angleVariation;
    
    // Vary radius around 1.0 for more predictable shapes
    // Range: (1 - randomness*0.6) to (1 + randomness*0.6)
    const radiusVariation = 1.0 + (seededRandom(seed + i * 200) - 0.5) * randomness * 1.2;
    const radius = baseRadius * radiusVariation;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    points.push({ x, y });
  }

  return points;
}

/**
 * Convert points array to SVG path string
 * Uses a mix of straight lines and curves for realistic geographic borders
 * @param points - Array of points forming the shape
 * @param seed - Seed for deterministic randomness
 * @param straightPercent - Percentage of segments that should be straight (0-100)
 */
export function pointsToPath(points: Point[], seed: number = 0, straightPercent: number = 40): string {
  if (points.length === 0) return "";
  
  const first = points[0];
  let path = `M ${first.x} ${first.y}`;
  
  // Mix straight lines (L) with curves (Q) for realistic borders
  const straightThreshold = Math.floor(straightPercent / 10); // Convert to 0-10 scale
  
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    
    // Deterministically decide if this segment is straight or curved
    const segmentSeed = seed + i * 31;
    const isStraight = (segmentSeed % 10) < straightThreshold;
    
    if (isStraight) {
      // Straight line to current point - creates angular/edgy borders
      path += ` L ${curr.x} ${curr.y}`;
    } else {
      // Quadratic curve through current point - creates organic curves
      const cpX = (curr.x + next.x) / 2;
      const cpY = (curr.y + next.y) / 2;
      path += ` Q ${curr.x} ${curr.y} ${cpX} ${cpY}`;
    }
  }
  
  // Close the path
  const last = points[points.length - 1];
  const closeSeed = seed + points.length * 31;
  if ((closeSeed % 10) < straightThreshold) {
    path += ` L ${first.x} ${first.y}`;
  } else {
    path += ` Q ${last.x} ${last.y} ${first.x} ${first.y}`;
  }
  path += " Z";
  
  return path;
}

/**
 * Generate a random point within a polygon
 */
export function randomPointInBounds(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  padding: number = 50
): Point {
  return {
    x: minX + padding + Math.random() * (maxX - minX - padding * 2),
    y: minY + padding + Math.random() * (maxY - minY - padding * 2),
  };
}

/**
 * Calculate bounding box for a set of points
 */
export function getBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Generate road path with organic curves between two points
 * @param from - Starting point
 * @param to - Ending point
 * @param seed - Seed for consistent randomness
 * @param curviness - How much the road curves (0 = straight, 1 = very curvy)
 * @param segments - Number of curve segments (more = more winding)
 */
export function generateRoadPath(
  from: Point, 
  to: Point, 
  seed: number = 0, 
  curviness: number = 0.3,
  segments: number = 3
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // For very short roads, just use a simple curve
  if (distance < 50 || segments < 2) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const perpX = -dy / distance;
    const perpY = dx / distance;
    const curveOffset = distance * curviness * (seededRandom(seed) - 0.5);
    const controlX = midX + perpX * curveOffset;
    const controlY = midY + perpY * curveOffset;
    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  }
  
  // Generate intermediate waypoints along the road with random offsets
  const waypoints: Point[] = [from];
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    
    // Base position along the straight line
    const baseX = from.x + dx * t;
    const baseY = from.y + dy * t;
    
    // Random perpendicular offset for organic feel
    // More offset in the middle, less at the ends
    const middleFactor = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
    const maxOffset = distance * curviness * 0.4 * middleFactor;
    const offset = maxOffset * (seededRandom(seed + i * 137) * 2 - 1);
    
    // Also add slight longitudinal variation (roads don't go perfectly straight even in direction)
    const longOffset = distance * curviness * 0.1 * (seededRandom(seed + i * 73) - 0.5);
    
    waypoints.push({
      x: baseX + perpX * offset + (dx / distance) * longOffset,
      y: baseY + perpY * offset + (dy / distance) * longOffset,
    });
  }
  waypoints.push(to);
  
  // Build a smooth path through all waypoints using quadratic curves
  let path = `M ${waypoints[0].x} ${waypoints[0].y}`;
  
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];
    
    if (i === waypoints.length - 1) {
      // Last segment - curve to end point
      const controlX = (prev.x + curr.x) / 2 + perpX * (seededRandom(seed + i * 50) - 0.5) * distance * curviness * 0.15;
      const controlY = (prev.y + curr.y) / 2 + perpY * (seededRandom(seed + i * 51) - 0.5) * distance * curviness * 0.15;
      path += ` Q ${controlX} ${controlY} ${curr.x} ${curr.y}`;
    } else {
      // Middle segments - smooth curve through point
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      path += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
    }
  }
  
  return path;
}

/**
 * Get color scheme for location type (Pokemon-style)
 */
export function getLocationColors(locationType: string | null): {
  fill: string;
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
} {
  switch (locationType) {
    case "country":
      return {
        fill: "url(#grass-texture)", // Grass texture
        stroke: "#16A34A", // Dark green border
        strokeWidth: 4,
      };
    case "province":
      return {
        fill: "url(#grass-texture-province)", // Lighter grass
        stroke: "#22C55E", // Medium green border
        strokeDasharray: "10,5",
        strokeWidth: 3,
      };
    case "city":
      return {
        fill: "#FDE047",
        stroke: "#CA8A04",
        strokeWidth: 2,
      };
    case "town":
      return {
        fill: "#FCA5A5",
        stroke: "#DC2626",
        strokeWidth: 1.5,
      };
    default:
      return {
        fill: "#F3F4F6",
        stroke: "#9CA3AF",
        strokeWidth: 1,
      };
  }
}

/**
 * Hash string to deterministic number (for consistent random generation)
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Seeded random number generator
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
