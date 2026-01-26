"use client";

import { useRef, useState, useEffect, MouseEvent, WheelEvent } from "react";
import Link from "next/link";
import {
  generateOrganicShape,
  pointsToPath,
  randomPointInBounds,
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

  // Generate regions on mount
  useEffect(() => {
    const generatedRegions: Region[] = [];
    
    // Find all countries and provinces
    const countries = nodes.filter((n) => n.locationType === "country");
    const provinces = nodes.filter((n) => n.locationType === "province");
    
    // Generate country regions
    countries.forEach((country) => {
      const seed = hashString(country.id);
      const baseRadius = 250;
      const sides = 7 + Math.floor(seededRandom(seed) * 4); // 7-10 sides
      
      const shape = generateOrganicShape(
        country.x,
        country.y,
        baseRadius,
        sides,
        0.4
      );
      
      // Find children (provinces in this country)
      const children = provinces.filter((p) => p.parentLocationId === country.id);
      
      generatedRegions.push({ node: country, shape, children });
    });
    
    // Generate province regions
    provinces.forEach((province) => {
      const seed = hashString(province.id);
      const baseRadius = 150;
      const sides = 6 + Math.floor(seededRandom(seed + 100) * 3); // 6-8 sides
      
      const shape = generateOrganicShape(
        province.x,
        province.y,
        baseRadius,
        sides,
        0.3
      );
      
      // Find children (cities in this province)
      const children = nodes.filter(
        (n) => n.locationType === "city" && n.parentLocationId === province.id
      );
      
      generatedRegions.push({ node: province, shape, children });
    });
    
    setRegions(generatedRegions);
  }, [nodes]);

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
        className="h-[600px] w-full cursor-grab active:cursor-grabbing rounded-lg border bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800"
        role="img"
        aria-label="Procedural world map"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Road pattern */}
          <pattern
            id="road-texture"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="10" fill="#8B7355" />
            <line x1="0" y1="5" x2="10" y2="5" stroke="#6B5845" strokeWidth="1" strokeDasharray="2,2" />
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
        </defs>

        {/* Background grid */}
        <pattern
          id="map-grid"
          width="50"
          height="50"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 50 0 L 0 0 0 50"
            fill="none"
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        </pattern>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#map-grid)" />

        {/* Draw regions (countries and provinces) */}
        {regions.map((region) => {
          const colors = getLocationColors(region.node.locationType);
          const isSelected = selectedNode === region.node.id;
          
          return (
            <g key={`region-${region.node.id}`}>
              <path
                d={pointsToPath(region.shape)}
                fill={colors.fill}
                fillOpacity={isSelected ? colors.fillOpacity + 0.1 : colors.fillOpacity}
                stroke={colors.stroke}
                strokeWidth={isSelected ? 3 : 2}
                strokeDasharray={region.node.locationType === "province" ? "5,5" : undefined}
                filter="url(#region-shadow)"
                style={{ transition: "all 0.3s" }}
              />
              
              {/* Region label */}
              <text
                x={region.node.x}
                y={region.node.y - 180}
                textAnchor="middle"
                fontSize="16"
                fontWeight="600"
                fill={colors.stroke}
                opacity="0.7"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {region.node.iconData} {region.node.name}
              </text>
            </g>
          );
        })}

        {/* Draw roads/connections with styled paths */}
        {links.map((link, index) => {
          const roadPath = generateRoadPath(
            { x: link.from.x, y: link.from.y },
            { x: link.to.x, y: link.to.y },
            0.15
          );
          
          return (
            <g key={`road-${link.from.id}-${link.to.id}-${index}`}>
              {/* Road shadow */}
              <path
                d={roadPath}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
              />
              {/* Main road */}
              <path
                d={roadPath}
                stroke="#8B7355"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
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
              />
            </g>
          );
        })}

        {/* Draw location nodes */}
        {nodes.map((node) => {
          const residentNames = node.residents.map((r) => r.name).join(", ");
          const isSelected = selectedNode === node.id;
          const icon = node.iconData || "📍";
          
          // Determine node size based on type
          let nodeRadius = 32;
          if (node.locationType === "country") nodeRadius = 48;
          else if (node.locationType === "province") nodeRadius = 40;
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
                
                {/* Node background circle with glow when selected */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? nodeRadius + 4 : nodeRadius}
                  fill="white"
                  stroke={isSelected ? "#3B82F6" : "#94A3B8"}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isSelected ? "url(#node-glow)" : undefined}
                  style={{ transition: "all 0.2s" }}
                />
                
                {/* Icon */}
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  fontSize={nodeRadius * 0.75}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {icon}
                </text>
                
                {/* Location name below */}
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
                
                {/* Resident count */}
                {node.residents.length > 0 && (
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
      
      <div className="mt-3 text-xs text-muted-foreground">
        <strong>Controls:</strong> Drag to pan • Scroll to zoom • Click locations to view details
      </div>
    </div>
  );
}
