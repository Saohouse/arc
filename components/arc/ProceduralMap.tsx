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
};

type Region = {
  node: MapNode;
  shape: Point[];
  children: MapNode[];
};

// Helper to detect coastal locations from their description
function isCoastalLocation(summary: string | null, overview: string | null, tags: string): boolean {
  const text = `${summary || ''} ${overview || ''} ${tags || ''}`.toLowerCase();
  if (!text.trim()) return false;
  
  const coastalKeywords = [
    'coast', 'coastal', 'port', 'harbor', 'harbour', 'bay', 'beach', 'seaside',
    'maritime', 'naval', 'fishing', 'dock', 'pier', 'wharf', 'ocean', 'sea',
    'waterfront', 'shore', 'shoreline', 'marina', 'lighthouse', 'island',
    'peninsula', 'cape', 'cove', 'inlet'
  ];
  
  return coastalKeywords.some(keyword => text.includes(keyword));
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

export function ProceduralMap({ nodes, links }: ProceduralMapProps) {
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
  
  // Dev mode state
  const [devMode, setDevMode] = useState(false);
  const [shapeParams, setShapeParams] = useState<ShapeParams>(defaultParams);

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
    
    setRegions(generatedRegions);
    setNodePositions(repositionedNodes);
  }, [nodes, mapSeed, shapeParams]); // Regenerate when mapSeed or params change

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
        className="h-[600px] w-full cursor-grab active:cursor-grabbing rounded-lg border"
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

        {/* Layer 3: Roads (below labels) */}
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
        
        {/* Layer 4: Region Labels (on top of roads) - FIXED screen size like sprites */}
        {(() => {
          // When zoomed in (smaller viewBox), SVG units appear LARGER on screen
          // So use SMALLER SVG values to keep constant screen size
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          // COUNTRY colors - Deep indigo/navy (authoritative, prominent)
          const countryColors = { bg: "#EEF2FF", border: "#4338CA", text: "#312E81" };
          
          return regions
            .filter((r) => r.node.locationType === "country")
            .map((region) => {
              // Base sizes (at default zoom)
              const baseFontSize = 22;
              const baseCharWidth = 14;
              const basePadding = 18;
              const baseBoxHeight = 34;
              const baseStrokeWidth = 3;
              const baseBorderRadius = 6;
              
              // Scale everything consistently
              const fontSize = baseFontSize * zoomScale;
              const charWidth = baseCharWidth * zoomScale;
              const textWidth = region.node.name.length * charWidth;
              const padding = basePadding * zoomScale;
              const boxHeight = baseBoxHeight * zoomScale;
              const strokeWidth = baseStrokeWidth * zoomScale;
              const borderRadius = baseBorderRadius * zoomScale;
              const verticalOffset = 35 * zoomScale;
              const textVerticalAdjust = 8 * zoomScale;
              
              const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + verticalOffset;
              
              return (
                <g key={`label-${region.node.id}`}>
                  <rect
                    x={region.node.x - textWidth / 2 - padding}
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
                    x={region.node.x}
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
        
        {(() => {
          // FIXED screen size like sprites
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          // PROVINCE colors - Teal/Cyan (official but softer than country)
          const provinceColors = { bg: "#ECFEFF", border: "#0891B2", text: "#155E75" };
          
          return regions
            .filter((r) => r.node.locationType === "province")
            .map((region) => {
              // Base sizes (at default zoom)
              const baseFontSize = 11;
              const baseCharWidth = 8.5;
              const basePadding = 10;
              const baseBoxHeight = 18;
              const baseStrokeWidth = 1.5;
              const baseBorderRadius = 3;
              
              // Scale everything consistently
              const fontSize = baseFontSize * zoomScale;
              const charWidth = baseCharWidth * zoomScale;
              const textWidth = region.node.name.length * charWidth;
              const padding = basePadding * zoomScale;
              const boxHeight = baseBoxHeight * zoomScale;
              const strokeWidth = baseStrokeWidth * zoomScale;
              const borderRadius = baseBorderRadius * zoomScale;
              const verticalOffset = 25 * zoomScale;
              const textVerticalAdjust = 4 * zoomScale;
              
              const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + verticalOffset;
              
              return (
                <g key={`label-${region.node.id}`}>
                  <rect
                    x={region.node.x - textWidth / 2 - padding}
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
                    x={region.node.x}
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

        {/* Layer 5: Location nodes and labels (topmost layer) - FIXED screen size like sprites */}
        {(() => {
          // FIXED screen size like sprites
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return nodes.map((node) => {
            const residentNames = node.residents.map((r) => r.name).join(", ");
            const isSelected = selectedNode === node.id;
            const icon = node.iconData || "📍";
            
            // Use repositioned coordinates for coastal cities
            const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
            const nodeX = pos.x;
            const nodeY = pos.y;
            
            // COLOR COORDINATION SYSTEM:
            // Country: Indigo (authoritative, prominent)
            // Province: Teal/Cyan (official, regional)
            // City: Amber/Orange (urban, bustling)
            // Town: Rose/Pink (cozy, small settlement)
            const labelColors = node.locationType === "city" 
              ? { bg: "#FFF7ED", border: "#EA580C", text: "#9A3412" } // Amber/Orange theme
              : node.locationType === "town"
              ? { bg: "#FDF2F8", border: "#DB2777", text: "#9D174D" } // Rose/Pink theme
              : { bg: "#F9FAFB", border: "#6B7280", text: "#374151" }; // Default gray
            
            // Base sizes (at default zoom)
            const baseIconSize = node.locationType === "country" || node.locationType === "province" ? 32 : 24;
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
            
            return (
              <g key={node.id}>
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
                  
                  {/* Location name with colored border - for cities and towns */}
                  {node.locationType !== "country" && node.locationType !== "province" && (
                    <g>
                      {/* Background box */}
                      <rect
                        x={nodeX - textWidth / 2 - padding}
                        y={nodeY + nameOffset - boxHeight / 2 - textVerticalAdjust}
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
                        x={nodeX}
                        y={nodeY + nameOffset}
                        textAnchor="middle"
                        fontSize={nameSize}
                        fontWeight={isSelected ? "700" : "600"}
                        fill={labelColors.text}
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {node.name}
                      </text>
                    </g>
                  )}
                  
                  {/* Resident count - constant screen size */}
                  {node.residents.length > 0 && node.locationType !== "country" && node.locationType !== "province" && (
                    <text
                      x={nodeX}
                      y={nodeY + residentOffset}
                      textAnchor="middle"
                      fontSize={residentSize}
                      fill="rgba(100, 116, 139, 0.8)"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.residents.length} resident{node.residents.length === 1 ? "" : "s"}
                    </text>
                  )}
                </a>
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
