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

  // Generate regions on mount and when seed changes
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
      
      // Generate realistic jagged country borders (like real countries!)
      const numSides = 24 + Math.floor(seededRandom(seed) * 12); // 24-36 sides for detailed jagged edges
      const countryPoints: Point[] = [];
      
      for (let i = 0; i < numSides; i++) {
        const baseAngle = (i / numSides) * Math.PI * 2;
        // Add angular jitter for jagged coastline effect
        const angleJitter = (seededRandom(seed + i * 73) - 0.5) * 0.25;
        const angle = baseAngle + angleJitter;
        
        // Radius variation for realistic irregular borders
        const radiusVariation = 0.75 + seededRandom(seed + i * 137) * 0.5; // 0.75 to 1.25
        const radius = maxDistance * radiusVariation;
        
        countryPoints.push({
          x: country.x + Math.cos(angle) * radius,
          y: country.y + Math.sin(angle) * radius,
        });
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
      const numSides = 16 + Math.floor(seededRandom(seed) * 8); // 16-24 sides for jagged edges
      const points: Point[] = [];
      
      for (let i = 0; i < numSides; i++) {
        const baseAngle = (i / numSides) * Math.PI * 2;
        // Add angular jitter for jagged edges
        const angleJitter = (seededRandom(seed + i * 50) - 0.5) * 0.3;
        const angle = baseAngle + angleJitter;
        
        // Start with a large radius
        let maxRadius = 200;
        
        // Limit by distance to siblings (Voronoi-like)
        siblings.forEach((sibling) => {
          const dx = sibling.x - province.x;
          const dy = sibling.y - province.y;
          const distToSibling = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate angle to sibling
          const angleToSibling = Math.atan2(dy, dx);
          
          // If this point direction is toward the sibling, limit the radius
          const angleDiff = Math.abs(angle - angleToSibling);
          const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
          
          if (normalizedDiff < Math.PI / 2) {
            // This direction faces toward the sibling
            // Limit to ~45% of the distance (so provinces meet in the middle with gap)
            const factor = 0.45 + (normalizedDiff / Math.PI) * 0.3; // 0.45 to 0.6
            const limitedRadius = distToSibling * factor;
            maxRadius = Math.min(maxRadius, limitedRadius);
          }
        });
        
        // Apply jagged variation FIRST (before boundary limiting)
        const minRadius = 50;
        const radiusVariation = 0.8 + seededRandom(seed + i * 100) * 0.4; // 0.8 to 1.2
        let finalRadius = Math.max(minRadius, maxRadius * radiusVariation);
        
        // THEN limit by country boundary (this is the FINAL limit - never exceed!)
        if (parentCountry) {
          const boundaryPoint = findBoundaryPoint(
            province.x,
            province.y,
            Math.cos(angle),
            Math.sin(angle),
            parentCountry.shape
          );
          if (boundaryPoint) {
            const distToBoundary = Math.sqrt(
              Math.pow(boundaryPoint.x - province.x, 2) + 
              Math.pow(boundaryPoint.y - province.y, 2)
            );
            // HARD LIMIT: Stay 15% inside country boundary (never exceed!)
            const maxAllowed = distToBoundary * 0.85;
            finalRadius = Math.min(finalRadius, maxAllowed);
          }
        }
        
        points.push({
          x: province.x + Math.cos(angle) * finalRadius,
          y: province.y + Math.sin(angle) * finalRadius,
        });
      }
      
      provinceShapes.set(province.id, points);
      generatedRegions.push({ node: province, shape: points, children });
    });
    
    setRegions(generatedRegions);
    setNodePositions(repositionedNodes);
  }, [nodes, mapSeed]); // Regenerate when mapSeed changes

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
      </div>

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
            
            return (
              <g key={`region-${region.node.id}`}>
                <path
                  d={pointsToPath(region.shape)}
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
            
            return (
              <g key={`region-${region.node.id}`}>
                <path
                  d={pointsToPath(region.shape)}
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
            0.08 // Reduced curviness for stability
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
        
        {/* Layer 4: Region Labels (on top of roads) - scales with zoom */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return regions
            .filter((r) => r.node.locationType === "country")
            .map((region) => {
              const colors = getLocationColors(region.node.locationType);
              
              // Scale all dimensions by zoom
              const fontSize = 22 * zoomScale;
              const textWidth = region.node.name.length * 14 * zoomScale;
              const padding = 18 * zoomScale;
              const boxHeight = 34 * zoomScale;
              const strokeWidth = 3.5 * zoomScale;
              const borderRadius = 6 * zoomScale;
              const labelYOffset = 35 * zoomScale;
              const textYOffset = 20 * zoomScale;
              
              const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + labelYOffset;
              
              return (
                <g key={`label-${region.node.id}`}>
                  <g>
                    <rect
                      x={region.node.x - textWidth / 2 - padding}
                      y={labelY - textYOffset}
                      width={textWidth + padding * 2}
                      height={boxHeight}
                      fill="white"
                      stroke={colors.stroke}
                      strokeWidth={strokeWidth}
                      rx={borderRadius}
                      filter="url(#label-shadow)"
                      style={{ pointerEvents: "none" }}
                    />
                    <text
                      x={region.node.x}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={fontSize}
                      fontWeight="900"
                      fill={colors.stroke}
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
                </g>
              );
            });
        })()}
        
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return regions
            .filter((r) => r.node.locationType === "province")
            .map((region) => {
              const colors = getLocationColors(region.node.locationType);
              
              // Scale all dimensions by zoom
              const fontSize = 12 * zoomScale;
              const textWidth = region.node.name.length * 7.5 * zoomScale;
              const padding = 8 * zoomScale;
              const boxHeight = 18 * zoomScale;
              const strokeWidth = 2 * zoomScale;
              const borderRadius = 3 * zoomScale;
              const labelYOffset = 25 * zoomScale;
              const textYOffset = 12 * zoomScale;
              
              const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + labelYOffset;
              
              return (
                <g key={`label-${region.node.id}`}>
                  <g>
                    <rect
                      x={region.node.x - textWidth / 2 - padding}
                      y={labelY - textYOffset}
                      width={textWidth + padding * 2}
                      height={boxHeight}
                      fill="white"
                      stroke={colors.stroke}
                      strokeWidth={strokeWidth}
                      rx={borderRadius}
                      filter="url(#label-shadow)"
                      style={{ pointerEvents: "none" }}
                    />
                    <text
                      x={region.node.x}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={fontSize}
                      fontWeight="700"
                      fill={colors.stroke}
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
                </g>
              );
            });
        })()}

        {/* Layer 5: Location nodes and labels (topmost layer) */}
        {(() => {
          // Calculate zoom scale factor - text scales to stay readable
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return nodes.map((node) => {
            const residentNames = node.residents.map((r) => r.name).join(", ");
            const isSelected = selectedNode === node.id;
            const icon = node.iconData || "📍";
            
            // Use repositioned coordinates for coastal cities
            const pos = nodePositions.get(node.id) || { x: node.x, y: node.y };
            const nodeX = pos.x;
            const nodeY = pos.y;
            
            // Determine node size based on type
            // Countries and provinces are subtle (region is main visual)
            // Cities and towns are prominent (node is main visual)
            let nodeRadius = 32;
            if (node.locationType === "country") nodeRadius = 24;
            else if (node.locationType === "province") nodeRadius = 20;
            else if (node.locationType === "city") nodeRadius = 36;
            else if (node.locationType === "town") nodeRadius = 28;
            
            // Scale sizes based on zoom level
            const iconSize = (node.locationType === "country" || node.locationType === "province" ? 32 : nodeRadius * 0.75) * zoomScale;
            const nameSize = 13 * zoomScale;
            const residentSize = 10 * zoomScale;
            const nameOffset = 28 * zoomScale;
            const residentOffset = 42 * zoomScale;
            const iconOffset = (node.locationType === "country" || node.locationType === "province" ? 12 : 10) * zoomScale;
            
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
                  
                  {/* Icon - scales with zoom */}
                  <text
                    x={nodeX}
                    y={nodeY + iconOffset}
                    textAnchor="middle"
                    fontSize={iconSize}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {icon}
                  </text>
                  
                  {/* Location name - scales with zoom */}
                  {node.locationType !== "country" && node.locationType !== "province" && (
                    <text
                      x={nodeX}
                      y={nodeY + nameOffset}
                      textAnchor="middle"
                      fontSize={nameSize}
                      fontWeight={isSelected ? "700" : "600"}
                      fill="rgba(15, 23, 42, 0.9)"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.name}
                    </text>
                  )}
                  
                  {/* Resident count - scales with zoom */}
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
