"use client";

import { useRef, useState, useEffect, MouseEvent, WheelEvent } from "react";
import Link from "next/link";
import {
  generateOrganicShape,
  pointsToPath,
  getBounds,
  generateRoadPath,
  getLocationColors,
  hashString,
  seededRandom,
  type Point,
} from "@/lib/map-generation";

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

type MapResident = {
  id: string;
  name: string;
};

type MapNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  residents: MapResident[];
  iconType: string;
  iconData: string | null;
  locationType: string | null;
  parentLocationId: string | null;
  summary: string | null;
  overview: string | null;
  tags: string;
};

type MapLink = {
  from: MapNode;
  to: MapNode;
};

type ProceduralMapProps = {
  nodes: MapNode[];
  links: MapLink[];
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
};

type Region = {
  node: MapNode;
  shape: Point[];
  children: MapNode[];
};

// Terrain feature types
type TerrainFeature = {
  type: 'tree' | 'mountain' | 'rock' | 'lake' | 'forest';
  x: number;
  y: number;
  size: number;
  seed: number;
  variant: number; // For visual variation
};

// Helper to detect coastal locations from their description
// Returns false for explicitly inland locations, true for coastal locations
function isCoastalLocation(summary: string | null, overview: string | null, tags: string): boolean {
  const text = `${summary || ''} ${overview || ''} ${tags || ''}`.toLowerCase();
  if (!text.trim()) return false;
  
  // INLAND keywords - if ANY of these are present, the location is NOT coastal
  const inlandKeywords = [
    'inland', 'interior', 'landlocked', 'mountain', 'mountainous', 'highland',
    'hilltop', 'hill town', 'valley', 'forest', 'woodland', 'woods',
    'plains', 'prairie', 'grassland', 'meadow', 'pasture',
    'desert', 'mesa', 'canyon', 'cave', 'underground', 'subterranean',
    'central', 'heartland', 'midland', 'upland', 'farmland', 'agricultural',
    'rural', 'countryside', 'village', 'hamlet', 'farming', 'ranching',
    'trade hub', 'trading post', 'crossroads', 'market town', 'merchant'
  ];
  
  // Check for inland keywords first - these override coastal
  if (inlandKeywords.some(keyword => text.includes(keyword))) {
    return false;
  }
  
  // COASTAL keywords - must be EXPLICITLY water-related
  const coastalKeywords = [
    'port city', 'port town', 'seaport', 'harbor', 'harbour', 
    'coastal', 'coast', 'seaside', 'waterfront', 'seafront',
    'bay', 'dock', 'wharf', 'marina', 'beach', 'shoreline',
    'nautical', 'maritime', 'naval', 'naval base',
    'fishing village', 'fishing port', 'fishing harbor',
    'ocean', 'oceanside', 'lakeside', 'lakefront',
    'estuary', 'peninsula', 'island', 'archipelago', 'reef',
    'lighthouse', 'pier', 'boardwalk', 'cove', 'inlet'
  ];
  
  // Use word boundary matching for all keywords to be more precise
  return coastalKeywords.some(keyword => {
    // For multi-word keywords, just check includes
    if (keyword.includes(' ')) {
      return text.includes(keyword);
    }
    // For single words, use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  });
}

// Shape generation parameters (adjustable in dev mode)
type ShapeParams = {
  // Country params
  countryAngularPercent: number;      // % of angular sections (0-100)
  countryAngularRadiusMin: number;    // Min radius variation for angular (0.5-1.0)
  countryAngularRadiusMax: number;    // Max radius variation for angular (1.0-1.5)
  countryOrganicRadiusMin: number;    // Min radius variation for organic (0.5-1.0)
  countryOrganicRadiusMax: number;    // Max radius variation for organic (1.0-1.5)
  countryAngleJitter: number;         // Angle jitter for organic (0-0.5)
  countrySides: number;               // Base number of sides (10-30)
  // Province params
  provinceAngularPercent: number;
  provinceAngularRadiusMin: number;
  provinceAngularRadiusMax: number;
  provinceOrganicRadiusMin: number;
  provinceOrganicRadiusMax: number;
  provinceAngleJitter: number;
  provinceSides: number;
  // Path rendering
  pathStraightPercent: number;        // % of path segments that are straight lines
  // Road params
  roadCurviness: number;              // How much roads curve (0-1)
  roadSegments: number;               // Number of curve segments in roads (2-8)
};

const defaultParams: ShapeParams = {
  countryAngularPercent: 50,
  countryAngularRadiusMin: 0.88,
  countryAngularRadiusMax: 1.12,
  countryOrganicRadiusMin: 0.7,
  countryOrganicRadiusMax: 1.3,
  countryAngleJitter: 0.3,
  countrySides: 18,
  provinceAngularPercent: 40,
  provinceAngularRadiusMin: 0.85,
  provinceAngularRadiusMax: 1.15,
  provinceOrganicRadiusMin: 0.8,
  provinceOrganicRadiusMax: 1.2,
  provinceAngleJitter: 0.35,
  provinceSides: 12,
  pathStraightPercent: 40,
  roadCurviness: 0.35,
  roadSegments: 4,
};

export function ProceduralMap({ nodes, links, isMaximized = false, onToggleMaximize }: ProceduralMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [mapSeed, setMapSeed] = useState(0); // For regeneration
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [labelOffsets, setLabelOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [terrainFeatures, setTerrainFeatures] = useState<TerrainFeature[]>([]);
  
  // Dev mode state
  const [devMode, setDevMode] = useState(false);
  const [shapeParams, setShapeParams] = useState<ShapeParams>(defaultParams);

  // Helper: Calculate the centroid (visual center) of a polygon
  const getPolygonCentroid = (shape: Point[]): { x: number; y: number } => {
    if (shape.length === 0) return { x: 0, y: 0 };
    
    let sumX = 0;
    let sumY = 0;
    let sumArea = 0;
    
    // Use the shoelace formula for centroid
    for (let i = 0; i < shape.length; i++) {
      const p1 = shape[i];
      const p2 = shape[(i + 1) % shape.length];
      const cross = p1.x * p2.y - p2.x * p1.y;
      sumArea += cross;
      sumX += (p1.x + p2.x) * cross;
      sumY += (p1.y + p2.y) * cross;
    }
    
    const area = sumArea / 2;
    if (Math.abs(area) < 0.0001) {
      // Fallback to simple average if area is too small
      const avgX = shape.reduce((sum, p) => sum + p.x, 0) / shape.length;
      const avgY = shape.reduce((sum, p) => sum + p.y, 0) / shape.length;
      return { x: avgX, y: avgY };
    }
    
    return {
      x: sumX / (6 * area),
      y: sumY / (6 * area),
    };
  };

  // Helper: Check if a point is inside a polygon (ray casting algorithm)
  const isPointInPolygon = (px: number, py: number, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Helper: Check if point is too close to any node position
  const isTooCloseToNode = (px: number, py: number, minDist: number): boolean => {
    for (const node of nodes) {
      const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
      const dx = px - pos.x;
      const dy = py - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
    }
    return false;
  };

  // Helper: Find where a ray from center intersects the polygon boundary
  const findBoundaryPoint = (
    centerX: number,
    centerY: number,
    dirX: number,
    dirY: number,
    shape: Point[]
  ): { x: number; y: number } | null => {
    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) return null;
    const ndx = dirX / len;
    const ndy = dirY / len;
    
    // Cast a ray from center in the direction and find intersection with polygon edges
    let closestDist = Infinity;
    let closestPoint: { x: number; y: number } | null = null;
    
    for (let i = 0; i < shape.length; i++) {
      const p1 = shape[i];
      const p2 = shape[(i + 1) % shape.length];
      
      // Line segment from p1 to p2
      const edgeX = p2.x - p1.x;
      const edgeY = p2.y - p1.y;
      
      // Solve for intersection: center + t * dir = p1 + s * edge
      const denom = ndx * edgeY - ndy * edgeX;
      if (Math.abs(denom) < 0.0001) continue; // Parallel
      
      const t = ((p1.x - centerX) * edgeY - (p1.y - centerY) * edgeX) / denom;
      const s = ((p1.x - centerX) * ndy - (p1.y - centerY) * ndx) / denom;
      
      // Check if intersection is valid (t > 0 for ray, 0 <= s <= 1 for segment)
      if (t > 0 && s >= 0 && s <= 1) {
        if (t < closestDist) {
          closestDist = t;
          closestPoint = {
            x: centerX + t * ndx,
            y: centerY + t * ndy,
          };
        }
      }
    }
    
    return closestPoint;
  };

  // Generate regions on mount and when seed/params change
  useEffect(() => {
    const generatedRegions: Region[] = [];
    
    // Find all countries and provinces
    const countries = nodes.filter((n) => n.locationType === "country");
    const provinces = nodes.filter((n) => n.locationType === "province");
    
    // Generate country regions - sized to contain all provinces
    const countryRegionsMap = new Map<string, Region>();
    countries.forEach((country) => {
      const seed = hashString(country.id) + mapSeed; // Use mapSeed for variation
      
      // Find children (provinces in this country)
      const children = provinces.filter((p) => p.parentLocationId === country.id);
      
      // Calculate radius to encompass all children
      let maxDistance = 200; // Default minimum
      if (children.length > 0) {
        children.forEach((child) => {
          const dx = child.x - country.x;
          const dy = child.y - country.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          maxDistance = Math.max(maxDistance, distance + 150); // Add padding around provinces
        });
      }
      
      // Generate realistic country borders - mix of angular segments and curves (like UN map)
      // Use shapeParams for adjustable values
      const numSides = shapeParams.countrySides + Math.floor(seededRandom(seed) * 8);
      const countryPoints: Point[] = [];
      const angularThreshold = Math.floor(shapeParams.countryAngularPercent / 10); // Convert to 0-10 scale
      
      for (let i = 0; i < numSides; i++) {
        const baseAngle = (i / numSides) * Math.PI * 2;
        
        // Decide if this section should be angular (straight) or organic (curved)
        const sectionSeed = seed + i * 73;
        const isAngularSection = (sectionSeed % 10) < angularThreshold;
        
        if (isAngularSection) {
          // Angular section: add 2-3 points in nearly straight line with slight offset
          const numSubPoints = 2 + Math.floor(seededRandom(sectionSeed) * 2);
          const sectionWidth = (Math.PI * 2 / numSides);
          
          for (let j = 0; j < numSubPoints; j++) {
            const subAngle = baseAngle + (j / numSubPoints) * sectionWidth;
            // Less radius variation for straighter edges (use params)
            const radiusRange = shapeParams.countryAngularRadiusMax - shapeParams.countryAngularRadiusMin;
            const radiusVariation = shapeParams.countryAngularRadiusMin + seededRandom(sectionSeed + j * 41) * radiusRange;
            const radius = maxDistance * radiusVariation;
            
            // Slight perpendicular offset for natural straight lines
            const perpOffset = (seededRandom(sectionSeed + j * 97) - 0.5) * 15;
            
            countryPoints.push({
              x: country.x + Math.cos(subAngle) * radius + Math.cos(subAngle + Math.PI/2) * perpOffset,
              y: country.y + Math.sin(subAngle) * radius + Math.sin(subAngle + Math.PI/2) * perpOffset,
            });
          }
        } else {
          // Organic section: single point with more variation for curves (use params)
          const angleJitter = (seededRandom(sectionSeed + 200) - 0.5) * shapeParams.countryAngleJitter;
          const angle = baseAngle + angleJitter;
          const radiusRange = shapeParams.countryOrganicRadiusMax - shapeParams.countryOrganicRadiusMin;
          const radiusVariation = shapeParams.countryOrganicRadiusMin + seededRandom(sectionSeed + 137) * radiusRange;
          const radius = maxDistance * radiusVariation;
          
          countryPoints.push({
            x: country.x + Math.cos(angle) * radius,
            y: country.y + Math.sin(angle) * radius,
          });
        }
      }
      
      const shape = countryPoints;
      
      const region = { node: country, shape, children };
      countryRegionsMap.set(country.id, region);
      generatedRegions.push(region);
    });
    
    // REPOSITION COASTAL CITIES to actual country boundary
    // Create a map of repositioned node positions
    const repositionedNodes = new Map<string, { x: number; y: number }>();
    
    nodes.forEach((node) => {
      if (node.locationType === "city" || node.locationType === "town") {
        const isCoastal = isCoastalLocation(node.summary, node.overview, node.tags);
        
        if (isCoastal && node.parentLocationId) {
          // Find the province
          const province = nodes.find((n) => n.id === node.parentLocationId);
          if (province && province.parentLocationId) {
            // Find the country
            const countryRegion = countryRegionsMap.get(province.parentLocationId);
            if (countryRegion) {
              const country = countryRegion.node;
              
              // Calculate direction from country center toward the province
              const dirX = province.x - country.x;
              const dirY = province.y - country.y;
              
              // Find the actual boundary point in that direction
              const boundaryPoint = findBoundaryPoint(
                country.x,
                country.y,
                dirX,
                dirY,
                countryRegion.shape
              );
              
              if (boundaryPoint) {
                // Position city slightly inside the boundary (5% inward)
                const insetFactor = 0.92; // 92% of the way to boundary
                const newX = country.x + (boundaryPoint.x - country.x) * insetFactor;
                const newY = country.y + (boundaryPoint.y - country.y) * insetFactor;
                
                repositionedNodes.set(node.id, { x: newX, y: newY });
              }
            }
          }
        }
      }
    });
    
    // Generate province regions using Voronoi-like territory allocation
    // Each province extends toward the midpoint between itself and neighbors
    
    // First, calculate territory boundaries for each province
    const provinceShapes = new Map<string, Point[]>();
    
    provinces.forEach((province) => {
      const seed = hashString(province.id) + mapSeed;
      
      // Find sibling provinces (same parent country)
      const siblings = provinces.filter(
        (p) => p.id !== province.id && p.parentLocationId === province.parentLocationId
      );
      
      // Find children (cities in this province)
      const children = nodes.filter(
        (n) => n.locationType === "city" && n.parentLocationId === province.id
      );
      
      // Get the parent country shape for boundary clipping
      const parentCountry = province.parentLocationId 
        ? countryRegionsMap.get(province.parentLocationId) 
        : null;
      
      // Generate points around the province, but limit by neighbors and country boundary
      // Province generation with angular/organic mix (like country borders)
      // Use shapeParams for adjustable values
      const numSections = shapeParams.provinceSides + Math.floor(seededRandom(seed) * 6);
      const points: Point[] = [];
      const provAngularThreshold = Math.floor(shapeParams.provinceAngularPercent / 10);
      
      // Helper to calculate limited radius for a given angle
      const calculateRadius = (angle: number, seedOffset: number, isAngular: boolean) => {
        let maxRadius = 200;
        
        // Limit by distance to siblings (Voronoi-like)
        siblings.forEach((sibling) => {
          const dx = sibling.x - province.x;
          const dy = sibling.y - province.y;
          const distToSibling = Math.sqrt(dx * dx + dy * dy);
          const angleToSibling = Math.atan2(dy, dx);
          const angleDiff = Math.abs(angle - angleToSibling);
          const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
          
          if (normalizedDiff < Math.PI / 2) {
            const factor = 0.45 + (normalizedDiff / Math.PI) * 0.3;
            maxRadius = Math.min(maxRadius, distToSibling * factor);
          }
        });
        
        // Apply radius variation based on section type (use params)
        const minRadius = 50;
        const radiusMin = isAngular ? shapeParams.provinceAngularRadiusMin : shapeParams.provinceOrganicRadiusMin;
        const radiusMax = isAngular ? shapeParams.provinceAngularRadiusMax : shapeParams.provinceOrganicRadiusMax;
        const radiusVariation = radiusMin + seededRandom(seed + seedOffset) * (radiusMax - radiusMin);
        let finalRadius = Math.max(minRadius, maxRadius * radiusVariation);
        
        // Limit by country boundary
        if (parentCountry) {
          const boundaryPoint = findBoundaryPoint(
            province.x, province.y,
            Math.cos(angle), Math.sin(angle),
            parentCountry.shape
          );
          if (boundaryPoint) {
            const distToBoundary = Math.sqrt(
              Math.pow(boundaryPoint.x - province.x, 2) + 
              Math.pow(boundaryPoint.y - province.y, 2)
            );
            finalRadius = Math.min(finalRadius, distToBoundary * 0.85);
          }
        }
        
        return finalRadius;
      };
      
      for (let i = 0; i < numSections; i++) {
        const baseAngle = (i / numSections) * Math.PI * 2;
        const sectionSeed = seed + i * 73;
        const isAngularSection = (sectionSeed % 10) < provAngularThreshold;
        
        if (isAngularSection) {
          // Angular section: 2-3 points forming a relatively straight edge
          const numSubPoints = 2 + Math.floor(seededRandom(sectionSeed) * 2);
          const sectionWidth = (Math.PI * 2 / numSections);
          
          for (let j = 0; j < numSubPoints; j++) {
            const subAngle = baseAngle + (j / numSubPoints) * sectionWidth;
            const finalRadius = calculateRadius(subAngle, i * 100 + j * 41, true);
            
            // Small perpendicular offset for natural-looking straight lines
            const perpOffset = (seededRandom(sectionSeed + j * 97) - 0.5) * 8;
            
            points.push({
              x: province.x + Math.cos(subAngle) * finalRadius + Math.cos(subAngle + Math.PI/2) * perpOffset,
              y: province.y + Math.sin(subAngle) * finalRadius + Math.sin(subAngle + Math.PI/2) * perpOffset,
            });
          }
        } else {
          // Organic section: single point for smooth curve (use params)
          const angleJitter = (seededRandom(sectionSeed + 200) - 0.5) * shapeParams.provinceAngleJitter;
          const angle = baseAngle + angleJitter;
          const finalRadius = calculateRadius(angle, i * 100, false);
          
          points.push({
            x: province.x + Math.cos(angle) * finalRadius,
            y: province.y + Math.sin(angle) * finalRadius,
          });
        }
      }
      
      provinceShapes.set(province.id, points);
      generatedRegions.push({ node: province, shape: points, children });
    });
    
    // TERRAIN GENERATION
    const terrain: TerrainFeature[] = [];
    const terrainSeed = mapSeed * 1000 + 42;
    
    // Get the country shapes for boundary checking
    const countryShapes = generatedRegions
      .filter(r => r.node.locationType === 'country')
      .map(r => r.shape);
    
    // Helper to check if point is inside any country
    const isInsideLand = (x: number, y: number): boolean => {
      return countryShapes.some(shape => isPointInPolygon(x, y, shape));
    };
    
    // Helper to check distance from roads
    const getDistanceFromRoads = (px: number, py: number): number => {
      let minDist = Infinity;
      links.forEach(link => {
        const fromPos = repositionedNodes.get(link.from.id) || { x: link.from.x, y: link.from.y };
        const toPos = repositionedNodes.get(link.to.id) || { x: link.to.x, y: link.to.y };
        
        // Distance from point to line segment
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
          const d = Math.sqrt((px - fromPos.x) ** 2 + (py - fromPos.y) ** 2);
          minDist = Math.min(minDist, d);
        } else {
          let t = Math.max(0, Math.min(1, ((px - fromPos.x) * dx + (py - fromPos.y) * dy) / lengthSq));
          const closestX = fromPos.x + t * dx;
          const closestY = fromPos.y + t * dy;
          const d = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
          minDist = Math.min(minDist, d);
        }
      });
      return minDist;
    };
    
    // Generate terrain based on country bounds
    if (countryShapes.length > 0) {
      // Get overall bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      countryShapes.forEach(shape => {
        shape.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      });
      
      // Grid-based placement for even distribution
      const gridSize = 35;
      
      for (let gx = minX; gx < maxX; gx += gridSize) {
        for (let gy = minY; gy < maxY; gy += gridSize) {
          // Add some randomness to grid position
          const cellSeed = terrainSeed + Math.floor(gx) * 100 + Math.floor(gy);
          const offsetX = (seededRandom(cellSeed) - 0.5) * gridSize * 0.8;
          const offsetY = (seededRandom(cellSeed + 1) - 0.5) * gridSize * 0.8;
          const px = gx + offsetX;
          const py = gy + offsetY;
          
          // Skip if not inside land
          if (!isInsideLand(px, py)) continue;
          
          // Skip if too close to a node
          const nodeMinDist = 45;
          let tooClose = false;
          for (const node of nodes) {
            const pos = repositionedNodes.get(node.id) || { x: node.x, y: node.y };
            const dx = px - pos.x;
            const dy = py - pos.y;
            if (Math.sqrt(dx * dx + dy * dy) < nodeMinDist) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
          
          // Check distance from roads
          const roadDist = getDistanceFromRoads(px, py);
          
          // Determine terrain type based on position and randomness
          const featureRoll = seededRandom(cellSeed + 2);
          const sizeRoll = seededRandom(cellSeed + 3);
          const variantRoll = Math.floor(seededRandom(cellSeed + 4) * 3);
          
          // Near roads: mostly empty or small trees
          if (roadDist < 25) {
            // Skip most terrain near roads for cleaner paths
            if (featureRoll > 0.3) continue;
            terrain.push({
              type: 'tree',
              x: px,
              y: py,
              size: 6 + sizeRoll * 4,
              seed: cellSeed,
              variant: variantRoll,
            });
          }
          // Medium distance: mix of trees and rocks
          else if (roadDist < 60) {
            if (featureRoll < 0.4) {
              terrain.push({
                type: 'tree',
                x: px,
                y: py,
                size: 8 + sizeRoll * 6,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.5) {
              terrain.push({
                type: 'rock',
                x: px,
                y: py,
                size: 4 + sizeRoll * 4,
                seed: cellSeed,
                variant: variantRoll,
              });
            }
          }
          // Far from roads: forests, mountains, lakes
          else {
            if (featureRoll < 0.35) {
              // Forest cluster
              terrain.push({
                type: 'forest',
                x: px,
                y: py,
                size: 15 + sizeRoll * 15,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.45) {
              // Single tree
              terrain.push({
                type: 'tree',
                x: px,
                y: py,
                size: 10 + sizeRoll * 8,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.52) {
              // Mountain
              terrain.push({
                type: 'mountain',
                x: px,
                y: py,
                size: 20 + sizeRoll * 25,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.56) {
              // Lake (less common)
              terrain.push({
                type: 'lake',
                x: px,
                y: py,
                size: 15 + sizeRoll * 20,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.62) {
              // Rocks
              terrain.push({
                type: 'rock',
                x: px,
                y: py,
                size: 5 + sizeRoll * 6,
                seed: cellSeed,
                variant: variantRoll,
              });
            }
            // Rest is empty grass/plains
          }
        }
      }
    }
    
    setTerrainFeatures(terrain);
    setRegions(generatedRegions);
    setNodePositions(repositionedNodes);
  }, [nodes, links, mapSeed, shapeParams]); // Regenerate when mapSeed or params change

  // Label collision detection and avoidance
  useEffect(() => {
    // Only process cities and towns (not country/province labels)
    const cityTownNodes = nodes.filter(
      (n) => n.locationType === "city" || n.locationType === "town"
    );
    
    if (cityTownNodes.length < 2) {
      setLabelOffsets(new Map());
      return;
    }
    
    // Constants for label sizing (must match render constants)
    const baseCharWidth = 7;
    const basePadding = 6;
    const baseBoxHeight = 16;
    const baseNameOffset = 28;
    
    // Calculate label bounding boxes
    type LabelBox = {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
    };
    
    const labelBoxes: LabelBox[] = cityTownNodes.map((node) => {
      const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
      const textWidth = node.name.length * baseCharWidth;
      const boxWidth = textWidth + basePadding * 2;
      const boxHeight = baseBoxHeight;
      
      return {
        id: node.id,
        x: pos.x - boxWidth / 2,
        y: pos.y + baseNameOffset - boxHeight / 2,
        width: boxWidth,
        height: boxHeight,
        offsetX: 0,
        offsetY: 0,
      };
    });
    
    // Check for collisions and apply offsets
    const checkOverlap = (a: LabelBox, b: LabelBox): boolean => {
      return !(
        a.x + a.width + a.offsetX < b.x + b.offsetX ||
        b.x + b.width + b.offsetX < a.x + a.offsetX ||
        a.y + a.height + a.offsetY < b.y + b.offsetY ||
        b.y + b.height + b.offsetY < a.y + a.offsetY
      );
    };
    
    // Multiple passes to resolve collisions
    for (let pass = 0; pass < 10; pass++) {
      let hasCollision = false;
      
      for (let i = 0; i < labelBoxes.length; i++) {
        for (let j = i + 1; j < labelBoxes.length; j++) {
          const a = labelBoxes[i];
          const b = labelBoxes[j];
          
          if (checkOverlap(a, b)) {
            hasCollision = true;
            
            // Calculate push direction
            const aCenterX = a.x + a.width / 2 + a.offsetX;
            const aCenterY = a.y + a.height / 2 + a.offsetY;
            const bCenterX = b.x + b.width / 2 + b.offsetX;
            const bCenterY = b.y + b.height / 2 + b.offsetY;
            
            let pushX = aCenterX - bCenterX;
            let pushY = aCenterY - bCenterY;
            
            // If centers are the same, push in a default direction
            if (Math.abs(pushX) < 0.1 && Math.abs(pushY) < 0.1) {
              pushX = 1;
              pushY = 0.5;
            }
            
            // Normalize and apply push
            const dist = Math.sqrt(pushX * pushX + pushY * pushY);
            const pushAmount = 12; // Pixels to push apart per iteration
            
            a.offsetX += (pushX / dist) * pushAmount;
            a.offsetY += (pushY / dist) * pushAmount;
            b.offsetX -= (pushX / dist) * pushAmount;
            b.offsetY -= (pushY / dist) * pushAmount;
          }
        }
      }
      
      if (!hasCollision) break;
    }
    
    // Create offset map
    const newOffsets = new Map<string, { x: number; y: number }>();
    labelBoxes.forEach((box) => {
      if (Math.abs(box.offsetX) > 0.1 || Math.abs(box.offsetY) > 0.1) {
        newOffsets.set(box.id, { x: box.offsetX, y: box.offsetY });
      }
    });
    
    setLabelOffsets(newOffsets);
  }, [nodes, nodePositions]);

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    setViewBox((prev) => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;
      
      if (newWidth < 200 || newWidth > MAP_WIDTH * 3) {
        return prev;
      }
      
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return prev;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomPointX = prev.x + (mouseX / rect.width) * prev.width;
      const zoomPointY = prev.y + (mouseY / rect.height) * prev.height;
      
      const newX = zoomPointX - (zoomPointX - prev.x) * scaleFactor;
      const newY = zoomPointY - (zoomPointY - prev.y) * scaleFactor;
      
      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    
    setViewBox((prev) => ({
      ...prev,
      x: prev.x - dx * scaleX,
      y: prev.y - dy * scaleY,
    }));
    
    setStartPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setViewBox({
      x: 0,
      y: 0,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
  };

  const zoomIn = () => {
    setViewBox((prev) => {
      const newWidth = prev.width * 0.8;
      const newHeight = prev.height * 0.8;
      
      if (newWidth < 200) return prev;
      
      return {
        x: prev.x + (prev.width - newWidth) / 2,
        y: prev.y + (prev.height - newHeight) / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const zoomOut = () => {
    setViewBox((prev) => {
      const newWidth = prev.width * 1.25;
      const newHeight = prev.height * 1.25;
      
      if (newWidth > MAP_WIDTH * 3) return prev;
      
      return {
        x: prev.x - (newWidth - prev.width) / 2,
        y: prev.y - (newHeight - prev.height) / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setMapSeed(prev => prev + 1)}
          className="rounded bg-white/90 p-1.5 shadow-sm hover:bg-gray-100 border border-gray-200"
          title="Regenerate map"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 8 A6 6 0 0 1 8 14 M8 14 A6 6 0 0 1 2 8 M2 8 A6 6 0 0 1 8 2" />
            <path d="M8 2 L8 5 L11 5" />
          </svg>
        </button>
        <button
          onClick={zoomIn}
          className="rounded bg-white/90 p-1.5 shadow-sm hover:bg-gray-100 border border-gray-200"
          title="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="4" x2="8" y2="12" />
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="rounded bg-white/90 p-1.5 shadow-sm hover:bg-gray-100 border border-gray-200"
          title="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="rounded bg-white/90 p-1.5 shadow-sm hover:bg-gray-100 border border-gray-200"
          title="Reset view"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8 L 8 4 L 12 8 M8 4 L 8 12" />
          </svg>
        </button>
        <button
          onClick={() => setDevMode(prev => !prev)}
          className={`rounded p-1.5 shadow-sm border ${devMode ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/90 hover:bg-gray-100 border-gray-200'}`}
          title="Toggle dev mode"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 1 L8 3 M8 13 L8 15 M1 8 L3 8 M13 8 L15 8" />
            <path d="M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" />
          </svg>
        </button>
        {onToggleMaximize && (
          <button
            onClick={onToggleMaximize}
            className={`rounded p-1.5 shadow-sm border ${isMaximized ? 'bg-blue-500 text-white border-blue-600' : 'bg-white/90 hover:bg-gray-100 border-gray-200'}`}
            title={isMaximized ? "Minimize map" : "Maximize map"}
          >
            {isMaximized ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12 L1 12 L1 15" />
                <path d="M12 4 L15 4 L15 1" />
                <path d="M1 12 L6 7" />
                <path d="M15 4 L10 9" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 6 L1 1 L6 1" />
                <path d="M15 10 L15 15 L10 15" />
                <path d="M1 1 L6 6" />
                <path d="M15 15 L10 10" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {/* Dev Mode Panel */}
      {devMode && (
        <div className="absolute left-2 top-2 z-10 bg-white/95 rounded-lg shadow-lg border border-gray-200 p-3 max-h-[580px] overflow-y-auto w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Shape Parameters</h3>
            <button 
              onClick={() => setShapeParams(defaultParams)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset
            </button>
          </div>
          
          {/* Country Settings */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Country</h4>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Sides: {shapeParams.countrySides}</span>
              <input
                type="range"
                min="8"
                max="40"
                value={shapeParams.countrySides}
                onChange={(e) => setShapeParams(p => ({ ...p, countrySides: Number(e.target.value) }))}
                className="w-full h-1.5 accent-indigo-600"
              />
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angular %: {shapeParams.countryAngularPercent}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={shapeParams.countryAngularPercent}
                onChange={(e) => setShapeParams(p => ({ ...p, countryAngularPercent: Number(e.target.value) }))}
                className="w-full h-1.5 accent-indigo-600"
              />
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angular Radius: {shapeParams.countryAngularRadiusMin.toFixed(2)} - {shapeParams.countryAngularRadiusMax.toFixed(2)}</span>
              <div className="flex gap-1">
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.02"
                  value={shapeParams.countryAngularRadiusMin}
                  onChange={(e) => setShapeParams(p => ({ ...p, countryAngularRadiusMin: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-indigo-600"
                />
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.02"
                  value={shapeParams.countryAngularRadiusMax}
                  onChange={(e) => setShapeParams(p => ({ ...p, countryAngularRadiusMax: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-indigo-600"
                />
              </div>
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Organic Radius: {shapeParams.countryOrganicRadiusMin.toFixed(2)} - {shapeParams.countryOrganicRadiusMax.toFixed(2)}</span>
              <div className="flex gap-1">
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.02"
                  value={shapeParams.countryOrganicRadiusMin}
                  onChange={(e) => setShapeParams(p => ({ ...p, countryOrganicRadiusMin: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-indigo-600"
                />
                <input
                  type="range"
                  min="1.0"
                  max="1.6"
                  step="0.02"
                  value={shapeParams.countryOrganicRadiusMax}
                  onChange={(e) => setShapeParams(p => ({ ...p, countryOrganicRadiusMax: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-indigo-600"
                />
              </div>
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angle Jitter: {shapeParams.countryAngleJitter.toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={shapeParams.countryAngleJitter}
                onChange={(e) => setShapeParams(p => ({ ...p, countryAngleJitter: Number(e.target.value) }))}
                className="w-full h-1.5 accent-indigo-600"
              />
            </label>
          </div>
          
          {/* Province Settings */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Province</h4>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Sides: {shapeParams.provinceSides}</span>
              <input
                type="range"
                min="6"
                max="30"
                value={shapeParams.provinceSides}
                onChange={(e) => setShapeParams(p => ({ ...p, provinceSides: Number(e.target.value) }))}
                className="w-full h-1.5 accent-teal-600"
              />
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angular %: {shapeParams.provinceAngularPercent}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={shapeParams.provinceAngularPercent}
                onChange={(e) => setShapeParams(p => ({ ...p, provinceAngularPercent: Number(e.target.value) }))}
                className="w-full h-1.5 accent-teal-600"
              />
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angular Radius: {shapeParams.provinceAngularRadiusMin.toFixed(2)} - {shapeParams.provinceAngularRadiusMax.toFixed(2)}</span>
              <div className="flex gap-1">
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.02"
                  value={shapeParams.provinceAngularRadiusMin}
                  onChange={(e) => setShapeParams(p => ({ ...p, provinceAngularRadiusMin: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-teal-600"
                />
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.02"
                  value={shapeParams.provinceAngularRadiusMax}
                  onChange={(e) => setShapeParams(p => ({ ...p, provinceAngularRadiusMax: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-teal-600"
                />
              </div>
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Organic Radius: {shapeParams.provinceOrganicRadiusMin.toFixed(2)} - {shapeParams.provinceOrganicRadiusMax.toFixed(2)}</span>
              <div className="flex gap-1">
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.02"
                  value={shapeParams.provinceOrganicRadiusMin}
                  onChange={(e) => setShapeParams(p => ({ ...p, provinceOrganicRadiusMin: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-teal-600"
                />
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.02"
                  value={shapeParams.provinceOrganicRadiusMax}
                  onChange={(e) => setShapeParams(p => ({ ...p, provinceOrganicRadiusMax: Number(e.target.value) }))}
                  className="w-1/2 h-1.5 accent-teal-600"
                />
              </div>
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Angle Jitter: {shapeParams.provinceAngleJitter.toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={shapeParams.provinceAngleJitter}
                onChange={(e) => setShapeParams(p => ({ ...p, provinceAngleJitter: Number(e.target.value) }))}
                className="w-full h-1.5 accent-teal-600"
              />
            </label>
          </div>
          
          {/* Path Rendering */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Border Lines</h4>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Straight Lines %: {shapeParams.pathStraightPercent}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={shapeParams.pathStraightPercent}
                onChange={(e) => setShapeParams(p => ({ ...p, pathStraightPercent: Number(e.target.value) }))}
                className="w-full h-1.5 accent-gray-600"
              />
            </label>
          </div>
          
          {/* Road Settings */}
          <div className="mb-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Roads</h4>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Curviness: {shapeParams.roadCurviness.toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={shapeParams.roadCurviness}
                onChange={(e) => setShapeParams(p => ({ ...p, roadCurviness: Number(e.target.value) }))}
                className="w-full h-1.5 accent-amber-600"
              />
            </label>
            
            <label className="block text-xs mb-1">
              <span className="text-gray-600">Segments (bends): {shapeParams.roadSegments}</span>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={shapeParams.roadSegments}
                onChange={(e) => setShapeParams(p => ({ ...p, roadSegments: Number(e.target.value) }))}
                className="w-full h-1.5 accent-amber-600"
              />
            </label>
          </div>
          
          <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t">
            Tip: Higher road curviness + more segments = winding organic roads.</div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={`${isMaximized ? 'h-[80vh]' : 'h-[600px]'} w-full cursor-grab active:cursor-grabbing rounded-lg border`}
        role="img"
        aria-label="Procedural world map"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Water texture pattern - Pokemon style ocean */}
          <pattern
            id="water-texture"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Base water color - vibrant blue */}
            <rect width="80" height="80" fill="#60A5FA" />
            {/* Darker blue gradient for depth */}
            <rect width="80" height="80" fill="#3B82F6" fillOpacity="0.15" />
            
            {/* Wave patterns - simple and clean */}
            <path
              d="M 0 15 Q 20 10, 40 15 T 80 15"
              stroke="#93C5FD"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M 0 40 Q 20 35, 40 40 T 80 40"
              stroke="#93C5FD"
              strokeWidth="2"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M 0 65 Q 20 60, 40 65 T 80 65"
              stroke="#93C5FD"
              strokeWidth="2"
              fill="none"
              opacity="0.3"
            />
          </pattern>
          
          {/* Grass texture pattern - Pokemon style grass */}
          <pattern
            id="grass-texture"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            {/* Base grass color */}
            <rect width="40" height="40" fill="#86EFAC" />
            {/* Darker grass patches */}
            <rect width="40" height="40" fill="#4ADE80" fillOpacity="0.2" />
            
            {/* Grass blades */}
            <path d="M 5 10 L 5 15" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            <path d="M 8 8 L 8 13" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            <path d="M 12 12 L 12 17" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
            <path d="M 18 6 L 18 11" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            <path d="M 22 14 L 22 19" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
            <path d="M 28 8 L 28 13" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            <path d="M 32 16 L 32 21" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
            <path d="M 35 10 L 35 15" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            
            {/* Small grass dots */}
            <circle cx="10" cy="20" r="1" fill="#16A34A" opacity="0.3" />
            <circle cx="20" cy="25" r="1" fill="#16A34A" opacity="0.3" />
            <circle cx="30" cy="22" r="1" fill="#16A34A" opacity="0.3" />
            <circle cx="15" cy="30" r="1" fill="#16A34A" opacity="0.3" />
            <circle cx="25" cy="35" r="1" fill="#16A34A" opacity="0.3" />
          </pattern>
          
          {/* Province grass texture - slightly different shade */}
          <pattern
            id="grass-texture-province"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            {/* Lighter grass for provinces */}
            <rect width="40" height="40" fill="#BBF7D0" />
            <rect width="40" height="40" fill="#86EFAC" fillOpacity="0.25" />
            
            {/* Grass blades */}
            <path d="M 6 11 L 6 16" stroke="#4ADE80" strokeWidth="1" opacity="0.5" />
            <path d="M 10 9 L 10 14" stroke="#4ADE80" strokeWidth="1" opacity="0.5" />
            <path d="M 15 13 L 15 18" stroke="#4ADE80" strokeWidth="1" opacity="0.4" />
            <path d="M 20 7 L 20 12" stroke="#4ADE80" strokeWidth="1" opacity="0.5" />
            <path d="M 25 15 L 25 20" stroke="#4ADE80" strokeWidth="1" opacity="0.4" />
            <path d="M 30 9 L 30 14" stroke="#4ADE80" strokeWidth="1" opacity="0.5" />
            <path d="M 35 17 L 35 22" stroke="#4ADE80" strokeWidth="1" opacity="0.4" />
            
            <circle cx="12" cy="22" r="1" fill="#22C55E" opacity="0.2" />
            <circle cx="22" cy="27" r="1" fill="#22C55E" opacity="0.2" />
            <circle cx="32" cy="24" r="1" fill="#22C55E" opacity="0.2" />
          </pattern>
          
          {/* Drop shadow for regions */}
          <filter id="region-shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2" />
          </filter>
          
          {/* Glow effect for selected nodes */}
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Drop shadow for labels */}
          <filter id="label-shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          
          {/* Terrain gradients for Pokemon-style graphics */}
          {/* Tree gradients */}
          <linearGradient id="tree-pine-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3D7A3D" />
            <stop offset="50%" stopColor="#2D5A27" />
            <stop offset="100%" stopColor="#1A3A1A" />
          </linearGradient>
          <linearGradient id="tree-deciduous-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="40%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient id="tree-dark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D5A27" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>
          
          {/* Mountain gradients */}
          <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="50%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          <linearGradient id="mountain-shade-grad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <linearGradient id="snow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E5E7EB" />
          </linearGradient>
          
          {/* Rock gradients */}
          <linearGradient id="rock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
          
          {/* Lake gradients */}
          <radialGradient id="lake-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="60%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </radialGradient>
          <linearGradient id="lake-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          
          {/* Trunk gradient */}
          <linearGradient id="trunk-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="50%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>

        {/* Water background - fills entire canvas */}
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#water-texture)" />

        {/* Layer 1: Countries (background regions) */}
        {regions
          .filter((r) => r.node.locationType === "country")
          .map((region) => {
            const colors = getLocationColors(region.node.locationType);
            const isSelected = selectedNode === region.node.id;
            const shapeSeed = hashString(region.node.id) + mapSeed;
            
            return (
              <g key={`region-${region.node.id}`}>
                <path
                  d={pointsToPath(region.shape, shapeSeed, shapeParams.pathStraightPercent)}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? colors.strokeWidth + 1 : colors.strokeWidth}
                  strokeDasharray={colors.strokeDasharray}
                  filter="url(#region-shadow)"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}
        
        {/* Layer 2: Provinces (smaller regions) */}
        {regions
          .filter((r) => r.node.locationType === "province")
          .map((region) => {
            const colors = getLocationColors(region.node.locationType);
            const isSelected = selectedNode === region.node.id;
            const shapeSeed = hashString(region.node.id) + mapSeed;
            
            return (
              <g key={`region-${region.node.id}`}>
                <path
                  d={pointsToPath(region.shape, shapeSeed, shapeParams.pathStraightPercent)}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? colors.strokeWidth + 1 : colors.strokeWidth}
                  strokeDasharray={colors.strokeDasharray}
                  filter="url(#region-shadow)"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}

        {/* Layer 3: Terrain Features (trees, mountains, rocks, lakes) - Pokemon style */}
        {terrainFeatures.map((feature, index) => {
          const key = `terrain-${feature.type}-${index}`;
          
          if (feature.type === 'tree') {
            // Detailed single tree - Pokemon style (no floating shadows)
            const s = feature.size;
            const isDeciduous = feature.variant === 0;
            const isPine = feature.variant === 1;
            
            if (isDeciduous) {
              // Lush deciduous tree with layered canopy
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  {/* Trunk with bark texture */}
                  <path
                    d={`M ${feature.x - 2.5} ${feature.y + 2} 
                        C ${feature.x - 3} ${feature.y - s * 0.15} ${feature.x - 2} ${feature.y - s * 0.3} ${feature.x - 1.5} ${feature.y - s * 0.35}
                        L ${feature.x + 1.5} ${feature.y - s * 0.35}
                        C ${feature.x + 2} ${feature.y - s * 0.3} ${feature.x + 3} ${feature.y - s * 0.15} ${feature.x + 2.5} ${feature.y + 2} Z`}
                    fill="url(#trunk-grad)"
                  />
                  {/* Trunk detail */}
                  <line x1={feature.x - 0.5} y1={feature.y - s * 0.1} x2={feature.x - 1} y2={feature.y + 1} stroke="#451A03" strokeWidth="0.5" opacity="0.4" />
                  {/* Back foliage - darkest */}
                  <ellipse cx={feature.x + s * 0.12} cy={feature.y - s * 0.45} rx={s * 0.42} ry={s * 0.38} fill="#14532D" />
                  <ellipse cx={feature.x - s * 0.15} cy={feature.y - s * 0.52} rx={s * 0.38} ry={s * 0.35} fill="#166534" />
                  {/* Middle foliage */}
                  <ellipse cx={feature.x} cy={feature.y - s * 0.55} rx={s * 0.48} ry={s * 0.4} fill="#15803D" />
                  <ellipse cx={feature.x - s * 0.18} cy={feature.y - s * 0.6} rx={s * 0.35} ry={s * 0.32} fill="#16A34A" />
                  <ellipse cx={feature.x + s * 0.15} cy={feature.y - s * 0.58} rx={s * 0.32} ry={s * 0.28} fill="#22C55E" />
                  {/* Front highlight leaves */}
                  <ellipse cx={feature.x - s * 0.08} cy={feature.y - s * 0.68} rx={s * 0.22} ry={s * 0.18} fill="#4ADE80" />
                  <ellipse cx={feature.x + s * 0.1} cy={feature.y - s * 0.72} rx={s * 0.15} ry={s * 0.12} fill="#86EFAC" opacity="0.8" />
                </g>
              );
            } else if (isPine) {
              // Detailed pine tree with multiple tiers
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  {/* Trunk */}
                  <rect x={feature.x - 2} y={feature.y - s * 0.05} width={4} height={s * 0.3} fill="url(#trunk-grad)" rx="1" />
                  {/* Bottom tier - widest, darkest */}
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.15} ${feature.x - s * 0.38},${feature.y + s * 0.1} ${feature.x + s * 0.38},${feature.y + s * 0.1}`}
                    fill="#14532D"
                  />
                  {/* Second tier */}
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.4} ${feature.x - s * 0.32},${feature.y - s * 0.05} ${feature.x + s * 0.32},${feature.y - s * 0.05}`}
                    fill="#166534"
                  />
                  {/* Third tier */}
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.65} ${feature.x - s * 0.26},${feature.y - s * 0.3} ${feature.x + s * 0.26},${feature.y - s * 0.3}`}
                    fill="#15803D"
                  />
                  {/* Top tier - smallest, brightest */}
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.9} ${feature.x - s * 0.18},${feature.y - s * 0.55} ${feature.x + s * 0.18},${feature.y - s * 0.55}`}
                    fill="#16A34A"
                  />
                  {/* Highlight on right side */}
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.9} ${feature.x + s * 0.05},${feature.y - s * 0.6} ${feature.x + s * 0.15},${feature.y - s * 0.58}`}
                    fill="#22C55E"
                    opacity="0.6"
                  />
                  <polygon
                    points={`${feature.x},${feature.y - s * 0.65} ${feature.x + s * 0.08},${feature.y - s * 0.38} ${feature.x + s * 0.22},${feature.y - s * 0.32}`}
                    fill="#22C55E"
                    opacity="0.5"
                  />
                </g>
              );
            } else {
              // Bush/shrub
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  <ellipse cx={feature.x + s * 0.08} cy={feature.y - s * 0.05} rx={s * 0.4} ry={s * 0.3} fill="#166534" />
                  <ellipse cx={feature.x - s * 0.1} cy={feature.y - s * 0.12} rx={s * 0.38} ry={s * 0.28} fill="#15803D" />
                  <ellipse cx={feature.x} cy={feature.y - s * 0.18} rx={s * 0.32} ry={s * 0.22} fill="#16A34A" />
                  <ellipse cx={feature.x - s * 0.05} cy={feature.y - s * 0.22} rx={s * 0.18} ry={s * 0.12} fill="#22C55E" opacity="0.7" />
                </g>
              );
            }
          }
          
          if (feature.type === 'forest') {
            // Forest cluster - individual detailed trees, no dark oval background
            const s = feature.size;
            const numTrees = 3 + feature.variant;
            
            // Generate tree positions in a natural cluster
            const treeData: { x: number; y: number; size: number; isPine: boolean }[] = [];
            for (let i = 0; i < numTrees; i++) {
              const angle = (i / numTrees) * Math.PI * 2 + seededRandom(feature.seed + i) * 1.2;
              const dist = s * 0.3 * (0.2 + seededRandom(feature.seed + i + 10) * 0.8);
              treeData.push({
                x: feature.x + Math.cos(angle) * dist,
                y: feature.y + Math.sin(angle) * dist * 0.4,
                size: s * (0.35 + seededRandom(feature.seed + i + 20) * 0.35),
                isPine: seededRandom(feature.seed + i + 30) > 0.5,
              });
            }
            // Sort by y for proper depth ordering
            treeData.sort((a, b) => a.y - b.y);
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {treeData.map((t, i) => {
                  if (t.isPine) {
                    // Mini pine tree
                    return (
                      <g key={`${key}-t-${i}`}>
                        <rect x={t.x - 1.5} y={t.y - t.size * 0.05} width={3} height={t.size * 0.25} fill="#78350F" rx="0.5" />
                        <polygon points={`${t.x},${t.y - t.size * 0.15} ${t.x - t.size * 0.3},${t.y + t.size * 0.08} ${t.x + t.size * 0.3},${t.y + t.size * 0.08}`} fill="#14532D" />
                        <polygon points={`${t.x},${t.y - t.size * 0.45} ${t.x - t.size * 0.24},${t.y - t.size * 0.08} ${t.x + t.size * 0.24},${t.y - t.size * 0.08}`} fill="#166534" />
                        <polygon points={`${t.x},${t.y - t.size * 0.72} ${t.x - t.size * 0.18},${t.y - t.size * 0.35} ${t.x + t.size * 0.18},${t.y - t.size * 0.35}`} fill="#15803D" />
                        <polygon points={`${t.x},${t.y - t.size * 0.72} ${t.x + t.size * 0.05},${t.y - t.size * 0.45} ${t.x + t.size * 0.14},${t.y - t.size * 0.4}`} fill="#22C55E" opacity="0.5" />
                      </g>
                    );
                  } else {
                    // Mini deciduous tree
                    return (
                      <g key={`${key}-t-${i}`}>
                        <rect x={t.x - 1.5} y={t.y - t.size * 0.15} width={3} height={t.size * 0.28} fill="#78350F" rx="0.5" />
                        <ellipse cx={t.x + t.size * 0.08} cy={t.y - t.size * 0.32} rx={t.size * 0.32} ry={t.size * 0.28} fill="#14532D" />
                        <ellipse cx={t.x - t.size * 0.05} cy={t.y - t.size * 0.38} rx={t.size * 0.3} ry={t.size * 0.26} fill="#15803D" />
                        <ellipse cx={t.x} cy={t.y - t.size * 0.42} rx={t.size * 0.25} ry={t.size * 0.2} fill="#16A34A" />
                        <ellipse cx={t.x - t.size * 0.05} cy={t.y - t.size * 0.48} rx={t.size * 0.15} ry={t.size * 0.12} fill="#22C55E" opacity="0.7" />
                      </g>
                    );
                  }
                })}
              </g>
            );
          }
          
          if (feature.type === 'mountain') {
            // Mountain sitting on ground (no floating shadow)
            const s = feature.size;
            const h = s * 1.3;
            const hasSnow = s > 25;
            const hasPeak2 = feature.variant > 0 && s > 30;
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {/* Secondary peak behind (if large) */}
                {hasPeak2 && (
                  <>
                    <polygon
                      points={`${feature.x + s * 0.35},${feature.y - h * 0.65} ${feature.x},${feature.y} ${feature.x + s * 0.7},${feature.y}`}
                      fill="#6B7280"
                    />
                    <polygon
                      points={`${feature.x + s * 0.35},${feature.y - h * 0.65} ${feature.x},${feature.y} ${feature.x + s * 0.35},${feature.y}`}
                      fill="#4B5563"
                    />
                  </>
                )}
                
                {/* Main mountain body - grounded */}
                <polygon
                  points={`${feature.x},${feature.y - h} ${feature.x - s * 0.55},${feature.y} ${feature.x + s * 0.55},${feature.y}`}
                  fill="#9CA3AF"
                />
                {/* Left face - darker shading */}
                <polygon
                  points={`${feature.x},${feature.y - h} ${feature.x - s * 0.55},${feature.y} ${feature.x - s * 0.05},${feature.y}`}
                  fill="#6B7280"
                />
                {/* Ridge highlights */}
                <polygon
                  points={`${feature.x},${feature.y - h} ${feature.x + s * 0.08},${feature.y - h * 0.5} ${feature.x + s * 0.25},${feature.y - h * 0.3} ${feature.x + s * 0.15},${feature.y - h * 0.35}`}
                  fill="#D1D5DB"
                  opacity="0.4"
                />
                {/* Rocky texture lines */}
                <path d={`M ${feature.x - s * 0.3} ${feature.y - h * 0.3} L ${feature.x - s * 0.15} ${feature.y - h * 0.5}`} stroke="#4B5563" strokeWidth="1" opacity="0.3" />
                <path d={`M ${feature.x + s * 0.2} ${feature.y - h * 0.25} L ${feature.x + s * 0.35} ${feature.y - h * 0.15}`} stroke="#6B7280" strokeWidth="1" opacity="0.3" />
                
                {/* Snow cap */}
                {hasSnow && (
                  <>
                    <polygon
                      points={`${feature.x},${feature.y - h} ${feature.x - s * 0.22},${feature.y - h * 0.58} ${feature.x + s * 0.22},${feature.y - h * 0.58}`}
                      fill="#F9FAFB"
                    />
                    {/* Snow drip on left */}
                    <polygon
                      points={`${feature.x - s * 0.15},${feature.y - h * 0.58} ${feature.x - s * 0.22},${feature.y - h * 0.42} ${feature.x - s * 0.1},${feature.y - h * 0.52}`}
                      fill="#F3F4F6"
                    />
                    {/* Snow drip on right */}
                    <polygon
                      points={`${feature.x + s * 0.1},${feature.y - h * 0.58} ${feature.x + s * 0.18},${feature.y - h * 0.48} ${feature.x + s * 0.08},${feature.y - h * 0.5}`}
                      fill="#FFFFFF"
                    />
                  </>
                )}
              </g>
            );
          }
          
          if (feature.type === 'rock') {
            // Rock formation - grounded, no floating shadow
            const s = feature.size;
            const numRocks = 1 + feature.variant;
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {/* Back rocks (if multiple) */}
                {numRocks > 1 && (
                  <>
                    <ellipse cx={feature.x + s * 0.25} cy={feature.y - s * 0.05} rx={s * 0.32} ry={s * 0.25} fill="#6B7280" />
                    <ellipse cx={feature.x + s * 0.2} cy={feature.y - s * 0.12} rx={s * 0.12} ry={s * 0.08} fill="#9CA3AF" opacity="0.5" />
                  </>
                )}
                {numRocks > 2 && (
                  <ellipse cx={feature.x - s * 0.3} cy={feature.y + s * 0.05} rx={s * 0.22} ry={s * 0.18} fill="#9CA3AF" />
                )}
                
                {/* Main rock */}
                <ellipse cx={feature.x} cy={feature.y} rx={s * 0.45} ry={s * 0.35} fill="#9CA3AF" />
                {/* Shading */}
                <ellipse cx={feature.x + s * 0.1} cy={feature.y + s * 0.08} rx={s * 0.35} ry={s * 0.25} fill="#6B7280" opacity="0.5" />
                {/* Highlight */}
                <ellipse cx={feature.x - s * 0.12} cy={feature.y - s * 0.1} rx={s * 0.18} ry={s * 0.12} fill="#D1D5DB" opacity="0.6" />
                {/* Detail crack */}
                <path d={`M ${feature.x - s * 0.1} ${feature.y + s * 0.15} Q ${feature.x + s * 0.05} ${feature.y} ${feature.x + s * 0.2} ${feature.y + s * 0.1}`} stroke="#4B5563" strokeWidth="0.8" fill="none" opacity="0.4" />
              </g>
            );
          }
          
          if (feature.type === 'lake') {
            // Lake with shore
            const s = feature.size;
            const lakePoints: Point[] = [];
            const numPoints = 10;
            for (let i = 0; i < numPoints; i++) {
              const angle = (i / numPoints) * Math.PI * 2;
              const radiusVariation = 0.75 + seededRandom(feature.seed + i) * 0.5;
              const r = s * 0.5 * radiusVariation;
              lakePoints.push({
                x: feature.x + Math.cos(angle) * r,
                y: feature.y + Math.sin(angle) * r * 0.5,
              });
            }
            
            // Shore points
            const shorePoints: Point[] = lakePoints.map((p) => ({
              x: feature.x + (p.x - feature.x) * 1.18,
              y: feature.y + (p.y - feature.y) * 1.18,
            }));
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {/* Shore/sand */}
                <path d={pointsToPath(shorePoints, feature.seed, 0)} fill="#D4A574" opacity="0.5" />
                {/* Water body */}
                <path d={pointsToPath(lakePoints, feature.seed, 0)} fill="#3B82F6" />
                {/* Water depth gradient - darker center */}
                <ellipse cx={feature.x + s * 0.05} cy={feature.y + s * 0.03} rx={s * 0.3} ry={s * 0.15} fill="#2563EB" opacity="0.4" />
                {/* Light reflection */}
                <ellipse cx={feature.x - s * 0.15} cy={feature.y - s * 0.08} rx={s * 0.18} ry={s * 0.06} fill="#93C5FD" opacity="0.6" />
                <ellipse cx={feature.x - s * 0.1} cy={feature.y - s * 0.05} rx={s * 0.08} ry={s * 0.03} fill="#BFDBFE" opacity="0.7" />
              </g>
            );
          }
          
          return null;
        })}

        {/* Layer 4: Roads */}
        {links.map((link, index) => {
          // Use repositioned coordinates for coastal cities
          const fromPos = nodePositions.get(link.from.id) || { x: link.from.x, y: link.from.y };
          const toPos = nodePositions.get(link.to.id) || { x: link.to.x, y: link.to.y };
          
          // Use consistent seed based on location IDs
          const seed = hashString(link.from.id + link.to.id);
          const roadPath = generateRoadPath(
            fromPos,
            toPos,
            seed,
            shapeParams.roadCurviness,
            shapeParams.roadSegments
          );
          
          return (
            <g key={`road-${link.from.id}-${link.to.id}-${index}`} style={{ pointerEvents: "none" }}>
              {/* Road shadow */}
              <path
                d={roadPath}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
              {/* Main road */}
              <path
                d={roadPath}
                stroke="#8B7355"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
              {/* Road center line */}
              <path
                d={roadPath}
                stroke="#FEF3C7"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="10,10"
                opacity="0.6"
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}

        {/* Layer 5: ALL ICONS (below all labels) */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return nodes.map((node) => {
            const residentNames = node.residents.map((r) => r.name).join(", ");
            const icon = node.iconData || "📍";
            
            // Use repositioned coordinates for coastal cities
            const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
            const nodeX = pos.x;
            const nodeY = pos.y;
            
            // Base sizes
            const baseIconSize = node.locationType === "country" || node.locationType === "province" ? 32 : 24;
            const baseIconOffset = 8;
            const iconSize = baseIconSize * zoomScale;
            const iconOffset = baseIconOffset * zoomScale;
            
            return (
              <g key={`icon-${node.id}`}>
                <a
                  href={`/archive/locations/${node.id}`}
                  onMouseEnter={() => setSelectedNode(node.id)}
                  onMouseLeave={() => setSelectedNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <title>
                    {residentNames
                      ? `${node.name} — ${residentNames}`
                      : `${node.name} — no residents yet`}
                  </title>
                  
                  {/* Icon - constant screen size */}
                  <text
                    x={nodeX}
                    y={nodeY + iconOffset}
                    textAnchor="middle"
                    fontSize={iconSize}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {icon}
                  </text>
                </a>
              </g>
            );
          });
        })()}
        
        {/* Layer 6: COUNTRY LABELS (on top of icons) */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          const countryColors = { bg: "#EEF2FF", border: "#4338CA", text: "#312E81" };
          
          return regions
            .filter((r) => r.node.locationType === "country")
            .map((region) => {
              const baseFontSize = 22;
              const baseCharWidth = 14;
              const basePadding = 18;
              const baseBoxHeight = 34;
              const baseStrokeWidth = 3;
              const baseBorderRadius = 6;
              
              const fontSize = baseFontSize * zoomScale;
              const charWidth = baseCharWidth * zoomScale;
              const textWidth = region.node.name.length * charWidth;
              const padding = basePadding * zoomScale;
              const boxHeight = baseBoxHeight * zoomScale;
              const strokeWidth = baseStrokeWidth * zoomScale;
              const borderRadius = baseBorderRadius * zoomScale;
              const textVerticalAdjust = 8 * zoomScale;
              
              const centroid = getPolygonCentroid(region.shape);
              const bounds = getBounds(region.shape);
              const labelX = centroid.x;
              const labelY = bounds.minY + (centroid.y - bounds.minY) * 0.4;
              
              return (
                <g key={`country-label-${region.node.id}`}>
                  <rect
                    x={labelX - textWidth / 2 - padding}
                    y={labelY - boxHeight / 2}
                    width={textWidth + padding * 2}
                    height={boxHeight}
                    fill={countryColors.bg}
                    stroke={countryColors.border}
                    strokeWidth={strokeWidth}
                    rx={borderRadius}
                    filter="url(#label-shadow)"
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={labelX}
                    y={labelY + textVerticalAdjust}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="900"
                    fill={countryColors.text}
                    style={{ 
                      pointerEvents: "none", 
                      userSelect: "none",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontFamily: "system-ui, -apple-system, sans-serif"
                    }}
                  >
                    {region.node.name}
                  </text>
                </g>
              );
            });
        })()}
        
        {/* Layer 7: PROVINCE LABELS (on top of country labels) */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          const provinceColors = { bg: "#ECFEFF", border: "#0891B2", text: "#155E75" };
          
          return regions
            .filter((r) => r.node.locationType === "province")
            .map((region) => {
              const baseFontSize = 11;
              const baseCharWidth = 8.5;
              const basePadding = 10;
              const baseBoxHeight = 18;
              const baseStrokeWidth = 1.5;
              const baseBorderRadius = 3;
              
              const fontSize = baseFontSize * zoomScale;
              const charWidth = baseCharWidth * zoomScale;
              const textWidth = region.node.name.length * charWidth;
              const padding = basePadding * zoomScale;
              const boxHeight = baseBoxHeight * zoomScale;
              const strokeWidth = baseStrokeWidth * zoomScale;
              const borderRadius = baseBorderRadius * zoomScale;
              const textVerticalAdjust = 4 * zoomScale;
              
              const centroid = getPolygonCentroid(region.shape);
              const labelX = centroid.x;
              const labelY = centroid.y;
              
              return (
                <g key={`province-label-${region.node.id}`}>
                  <rect
                    x={labelX - textWidth / 2 - padding}
                    y={labelY - boxHeight / 2}
                    width={textWidth + padding * 2}
                    height={boxHeight}
                    fill={provinceColors.bg}
                    stroke={provinceColors.border}
                    strokeWidth={strokeWidth}
                    rx={borderRadius}
                    filter="url(#label-shadow)"
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={labelX}
                    y={labelY + textVerticalAdjust}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="700"
                    fill={provinceColors.text}
                    style={{ 
                      pointerEvents: "none", 
                      userSelect: "none",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "system-ui, -apple-system, sans-serif"
                    }}
                  >
                    {region.node.name}
                  </text>
                </g>
              );
            });
        })()}

        {/* Layer 8: CITY/TOWN LABELS (topmost layer - always on top of everything) */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return nodes.map((node) => {
            // Skip country and province labels (handled in layers 5-6)
            if (node.locationType === "country" || node.locationType === "province") {
              return null;
            }
            
            const isSelected = selectedNode === node.id;
            
            // Use repositioned coordinates for coastal cities
            const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
            const nodeX = pos.x;
            const nodeY = pos.y;
            
            // Get label offset for collision avoidance
            const labelOffset = labelOffsets.get(node.id) || { x: 0, y: 0 };
            
            // COLOR COORDINATION SYSTEM
            const labelColors = node.locationType === "city" 
              ? { bg: "#FFF7ED", border: "#EA580C", text: "#9A3412" } // Amber/Orange theme
              : node.locationType === "town"
              ? { bg: "#FDF2F8", border: "#DB2777", text: "#9D174D" } // Rose/Pink theme
              : { bg: "#F9FAFB", border: "#6B7280", text: "#374151" }; // Default gray
            
            // Base sizes (at default zoom)
            const baseIconSize = 24;
            const baseNameSize = 11;
            const baseResidentSize = 9;
            const baseIconOffset = 8;
            const baseNameOffset = 28;
            const baseResidentOffset = 42;
            const baseCharWidth = 7;
            const basePadding = 6;
            const baseBoxHeight = 16;
            const baseStrokeWidth = 1.5;
            const baseBorderRadius = 4;
            
            // Scale everything consistently
            const iconSize = baseIconSize * zoomScale;
            const nameSize = baseNameSize * zoomScale;
            const residentSize = baseResidentSize * zoomScale;
            const iconOffset = baseIconOffset * zoomScale;
            const nameOffset = baseNameOffset * zoomScale;
            const residentOffset = baseResidentOffset * zoomScale;
            const charWidth = baseCharWidth * zoomScale;
            const padding = basePadding * zoomScale;
            const boxHeight = baseBoxHeight * zoomScale;
            const strokeWidth = baseStrokeWidth * zoomScale;
            const borderRadius = baseBorderRadius * zoomScale;
            const textWidth = node.name.length * charWidth;
            const textVerticalAdjust = 4 * zoomScale;
            
            // Apply label offset (scaled for zoom)
            const labelX = nodeX + labelOffset.x * zoomScale;
            const labelY = nodeY + labelOffset.y * zoomScale;
            
            return (
              <g key={`label-${node.id}`}>
                {/* Leader line from icon to label if offset is significant */}
                {(Math.abs(labelOffset.x) > 5 || Math.abs(labelOffset.y) > 5) && (
                  <line
                    x1={nodeX}
                    y1={nodeY + iconOffset + iconSize * 0.3}
                    x2={labelX}
                    y2={labelY + nameOffset - boxHeight / 2 - textVerticalAdjust}
                    stroke={labelColors.border}
                    strokeWidth={strokeWidth * 0.5}
                    strokeDasharray={`${2 * zoomScale},${2 * zoomScale}`}
                    opacity={0.5}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {/* Background box */}
                <rect
                  x={labelX - textWidth / 2 - padding}
                  y={labelY + nameOffset - boxHeight / 2 - textVerticalAdjust}
                  width={textWidth + padding * 2}
                  height={boxHeight}
                  fill={labelColors.bg}
                  stroke={labelColors.border}
                  strokeWidth={strokeWidth}
                  rx={borderRadius}
                  style={{ pointerEvents: "none" }}
                />
                {/* Text */}
                <text
                  x={labelX}
                  y={labelY + nameOffset}
                  textAnchor="middle"
                  fontSize={nameSize}
                  fontWeight={isSelected ? "700" : "600"}
                  fill={labelColors.text}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.name}
                </text>
                
                {/* Resident count */}
                {node.residents.length > 0 && (
                  <text
                    x={labelX}
                    y={labelY + residentOffset}
                    textAnchor="middle"
                    fontSize={residentSize}
                    fill="rgba(100, 116, 139, 0.8)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.residents.length} resident{node.residents.length === 1 ? "" : "s"}
                  </text>
                )}
              </g>
            );
          });
        })()}
      </svg>
      
      <div className="mt-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          <strong>Controls:</strong> Drag to pan • Scroll to zoom • Click locations to view details
        </div>
        
        {/* Legend - Pokemon Style */}
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <div className="font-bold text-foreground">Map Legend:</div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 border-green-600" style={{ background: "url('/api/placeholder/24/24')", backgroundColor: "#86EFAC" }}></div>
            <span className="text-foreground">🌍 Country</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 border-green-500 border-dashed" style={{ background: "url('/api/placeholder/24/24')", backgroundColor: "#BBF7D0" }}></div>
            <span className="text-foreground">🏛️ Province</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full bg-amber-700"></div>
            <span className="text-foreground">🛣️ Roads</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: "#60A5FA" }}></div>
            <span className="text-foreground">🌊 Ocean</span>
          </div>
        </div>
      </div>
    </div>
  );
}
