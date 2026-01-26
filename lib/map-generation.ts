/**
 * Map Generation Utilities
 * Procedural generation for beautiful hierarchical maps
 */

export type Point = { x: number; y: number };

/**
 * Generate a random organic shape (polygon) around a center point
 */
export function generateOrganicShape(
  centerX: number,
  centerY: number,
  baseRadius: number,
  sides: number = 8,
  randomness: number = 0.3
): Point[] {
  const points: Point[] = [];
  const angleStep = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = angleStep * i;
    // Add randomness to radius for organic look
    const radiusVariation = 1 + (Math.random() - 0.5) * randomness;
    const radius = baseRadius * radiusVariation;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    points.push({ x, y });
  }

  return points;
}

/**
 * Convert points array to SVG path string
 */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  
  const first = points[0];
  let path = `M ${first.x} ${first.y}`;
  
  // Use quadratic curves for smooth organic shapes
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    
    // Control point between current and next
    const cpX = (curr.x + next.x) / 2;
    const cpY = (curr.y + next.y) / 2;
    
    path += ` Q ${curr.x} ${curr.y} ${cpX} ${cpY}`;
  }
  
  // Close the path smoothly
  const last = points[points.length - 1];
  path += ` Q ${last.x} ${last.y} ${first.x} ${first.y}`;
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
 * Generate road path with curves between two points
 */
export function generateRoadPath(from: Point, to: Point, curviness: number = 0.2): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Create subtle curve in the road
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  // Perpendicular offset for curve
  const perpX = -dy / distance;
  const perpY = dx / distance;
  const curveOffset = distance * curviness * (Math.random() - 0.5);
  
  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;
  
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

/**
 * Get color scheme for location type
 */
export function getLocationColors(locationType: string | null): {
  fill: string;
  stroke: string;
  fillOpacity: number;
} {
  switch (locationType) {
    case "country":
      return {
        fill: "#E8F4F8",
        stroke: "#3B82F6",
        fillOpacity: 0.15,
      };
    case "province":
      return {
        fill: "#F0FDF4",
        stroke: "#10B981",
        fillOpacity: 0.2,
      };
    case "city":
      return {
        fill: "#FEF3C7",
        stroke: "#F59E0B",
        fillOpacity: 0.25,
      };
    case "town":
      return {
        fill: "#FCE7F3",
        stroke: "#EC4899",
        fillOpacity: 0.2,
      };
    default:
      return {
        fill: "#F3F4F6",
        stroke: "#9CA3AF",
        fillOpacity: 0.1,
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
