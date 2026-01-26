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
      
      // More organic shape for realistic country borders
      const sides = 9 + Math.floor(seededRandom(seed) * 5); // 9-13 sides for complex borders
      
      const shape = generateOrganicShape(
        country.x,
        country.y,
        maxDistance,
        sides,
        0.55, // High randomness for very irregular country shapes
        seed
      );
      
      const region = { node: country, shape, children };
      countryRegionsMap.set(country.id, region);
      generatedRegions.push(region);
    });
    
    // Generate province regions - CLIPPED to stay inside parent country
    provinces.forEach((province) => {
      const seed = hashString(province.id) + mapSeed; // Use mapSeed for variation
      
      // Find children (cities in this province)
      const children = nodes.filter(
        (n) => n.locationType === "city" && n.parentLocationId === province.id
      );
      
      // SMALLER radius to prevent overlap - provinces should be distinct, not overlapping
      let maxDistance = 60; // Reduced minimum
      if (children.length > 0) {
        children.forEach((child) => {
          const dx = child.x - province.x;
          const dy = child.y - province.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          maxDistance = Math.max(maxDistance, distance + 35); // Less padding to prevent overlap
        });
      }
      
      // Cap to prevent excessive overlap
      maxDistance = Math.min(maxDistance, 95);
      
      // More sides and irregularity for non-circular shapes
      const sides = 9 + Math.floor(seededRandom(seed + 100) * 5); // 9-13 sides
      
      let shape = generateOrganicShape(
        province.x,
        province.y,
        maxDistance,
        sides,
        0.5, // High randomness for irregular, non-circular shapes
        seed + 1000
      );
      
      // CRITICAL: Scale down province if it extends beyond parent country boundary
      if (province.parentLocationId && countryRegionsMap.has(province.parentLocationId)) {
        const parentCountry = countryRegionsMap.get(province.parentLocationId)!;
        const countryBounds = getBounds(parentCountry.shape);
        const provinceBounds = getBounds(shape);
        
        // Check if province extends beyond country
        const extendsLeft = provinceBounds.minX < countryBounds.minX;
        const extendsRight = provinceBounds.maxX > countryBounds.maxX;
        const extendsTop = provinceBounds.minY < countryBounds.minY;
        const extendsBottom = provinceBounds.maxY > countryBounds.maxY;
        
        if (extendsLeft || extendsRight || extendsTop || extendsBottom) {
          // Scale down by 80% and regenerate
          const scaledDistance = maxDistance * 0.75;
          shape = generateOrganicShape(
            province.x,
            province.y,
            scaledDistance,
            sides,
            0.4, // Less randomness for safer fit
            seed + 1000
          );
        }
      }
      
      generatedRegions.push({ node: province, shape, children });
    });
    
    setRegions(generatedRegions);
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
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
        <button
          onClick={() => setMapSeed(prev => prev + 1)}
          className="rounded-md bg-background/90 px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted border"
          title="Regenerate map (new procedural shapes)"
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 8 A6 6 0 0 1 8 14 M8 14 A6 6 0 0 1 2 8 M2 8 A6 6 0 0 1 8 2" />
              <path d="M8 2 L8 5 L11 5" />
            </svg>
            <span>Regenerate</span>
          </div>
        </button>
        <button
          onClick={zoomIn}
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted border"
          title="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="4" x2="8" y2="12" />
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted border"
          title="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted border"
          title="Reset view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
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
          // Use consistent seed based on location IDs
          const seed = hashString(link.from.id + link.to.id);
          const roadPath = generateRoadPath(
            { x: link.from.x, y: link.from.y },
            { x: link.to.x, y: link.to.y },
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
        
        {/* Layer 4: Region Labels (on top of roads) */}
        {regions
          .filter((r) => r.node.locationType === "country")
          .map((region) => {
            const colors = getLocationColors(region.node.locationType);
            
            return (
              <g key={`label-${region.node.id}`}>
                {/* Region label - Pokemon style - LARGE for countries */}
                {(() => {
                  const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + 35;
                  const labelText = region.node.name;
                  const textWidth = labelText.length * 14; // Larger width for bigger font
                  const padding = 18;
                  
                  return (
                    <g>
                      {/* Background box - larger and more prominent */}
                      <rect
                        x={region.node.x - textWidth / 2 - padding}
                        y={labelY - 20}
                        width={textWidth + padding * 2}
                        height={34}
                        fill="white"
                        stroke={colors.stroke}
                        strokeWidth="3.5"
                        rx="6"
                        filter="url(#label-shadow)"
                        style={{ pointerEvents: "none" }}
                      />
                      {/* Label text - much bigger */}
                      <text
                        x={region.node.x}
                        y={labelY}
                        textAnchor="middle"
                        fontSize="22"
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
                        {labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        
        {regions
          .filter((r) => r.node.locationType === "province")
          .map((region) => {
            const colors = getLocationColors(region.node.locationType);
            
            return (
              <g key={`label-${region.node.id}`}>
                {/* Region label - Pokemon style */}
                {(() => {
                  const labelY = region.node.y - (getBounds(region.shape).maxY - region.node.y) + 25;
                  const labelText = region.node.name;
                  const textWidth = labelText.length * 7.5; // Approximate width
                  const padding = 8;
                  
                  return (
                    <g>
                      {/* Background box - clean design */}
                      <rect
                        x={region.node.x - textWidth / 2 - padding}
                        y={labelY - 12}
                        width={textWidth + padding * 2}
                        height={18}
                        fill="white"
                        stroke={colors.stroke}
                        strokeWidth="2"
                        rx="3"
                        filter="url(#label-shadow)"
                        style={{ pointerEvents: "none" }}
                      />
                      {/* Label text */}
                      <text
                        x={region.node.x}
                        y={labelY}
                        textAnchor="middle"
                        fontSize="12"
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
                        {labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

        {/* Layer 5: Location nodes and labels (topmost layer) */}
        {nodes.map((node) => {
          const residentNames = node.residents.map((r) => r.name).join(", ");
          const isSelected = selectedNode === node.id;
          const icon = node.iconData || "📍";
          
          // Determine node size based on type
          // Countries and provinces are subtle (region is main visual)
          // Cities and towns are prominent (node is main visual)
          let nodeRadius = 32;
          if (node.locationType === "country") nodeRadius = 24; // Smaller, subtle
          else if (node.locationType === "province") nodeRadius = 20; // Smaller, subtle
          else if (node.locationType === "city") nodeRadius = 36;
          else if (node.locationType === "town") nodeRadius = 28;
          
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
                
                {/* Node background circle - REMOVED per user feedback */}
                
                {/* Icon - clean and simple */}
                <text
                  x={node.x}
                  y={node.y + (node.locationType === "country" || node.locationType === "province" ? 12 : 10)}
                  textAnchor="middle"
                  fontSize={
                    node.locationType === "country" || node.locationType === "province"
                      ? 32
                      : nodeRadius * 0.75
                  }
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {icon}
                </text>
                
                {/* Location name below - only for cities and towns (countries/provinces have region labels) */}
                {node.locationType !== "country" && node.locationType !== "province" && (
                  <text
                    x={node.x}
                    y={node.y + nodeRadius + 20}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight={isSelected ? "700" : "600"}
                    fill="rgba(15, 23, 42, 0.9)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.name}
                  </text>
                )}
                
                {/* Resident count - only for cities and towns */}
                {node.residents.length > 0 && node.locationType !== "country" && node.locationType !== "province" && (
                  <text
                    x={node.x}
                    y={node.y + nodeRadius + 36}
                    textAnchor="middle"
                    fontSize="11"
                    fill="rgba(100, 116, 139, 0.9)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.residents.length} resident{node.residents.length === 1 ? "" : "s"}
                  </text>
                )}
              </a>
            </g>
          );
        })}
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
