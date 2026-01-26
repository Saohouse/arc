"use client";

import { useRef, useState, useEffect, MouseEvent, WheelEvent } from "react";
import Link from "next/link";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;

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
};

type MapLink = {
  from: MapNode;
  to: MapNode;
};

type InteractiveMapProps = {
  nodes: MapNode[];
  links: MapLink[];
};

export function InteractiveMap({ nodes, links }: InteractiveMapProps) {
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

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    setViewBox((prev) => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;
      
      // Limit zoom
      if (newWidth < 200 || newWidth > MAP_WIDTH * 3) {
        return prev;
      }
      
      // Zoom toward mouse position
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
    if (e.button !== 0) return; // Only left click
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
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted"
          title="Zoom in"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="4" x2="8" y2="12" />
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted"
          title="Zoom out"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="rounded-md bg-background/90 p-2 text-sm font-medium shadow-sm hover:bg-muted"
          title="Reset view"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 8 L 8 4 L 12 8 M8 4 L 8 12" />
          </svg>
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="h-[520px] w-full cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="World map"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <pattern
            id="map-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(120, 120, 120, 0.15)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#map-grid)" />
        <rect
          x="20"
          y="20"
          width={MAP_WIDTH - 40}
          height={MAP_HEIGHT - 40}
          rx="28"
          fill="rgba(250, 250, 250, 0.8)"
          stroke="rgba(120, 120, 120, 0.2)"
        />

        {links.map((link, index) => (
          <line
            key={`${link.from.id}-${link.to.id}-${index}`}
            x1={link.from.x}
            y1={link.from.y}
            x2={link.to.x}
            y2={link.to.y}
            stroke="rgba(99, 102, 241, 0.35)"
            strokeWidth="2"
          />
        ))}

        {nodes.map((node) => {
          const residentNames = node.residents.map((r) => r.name).join(", ");
          const isSelected = selectedNode === node.id;
          const icon = node.iconData || "📍";
          
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
                
                {/* Background circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 36 : 32}
                  fill={
                    isSelected
                      ? "rgba(99, 102, 241, 0.15)"
                      : "rgba(255, 255, 255, 0.9)"
                  }
                  stroke={
                    isSelected
                      ? "rgba(99, 102, 241, 1)"
                      : "rgba(99, 102, 241, 0.4)"
                  }
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ transition: "all 0.2s" }}
                />
                
                {/* Icon as text */}
                <text
                  x={node.x}
                  y={node.y + 8}
                  textAnchor="middle"
                  fontSize="28"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {icon}
                </text>
                
                {/* Location name below */}
                <text
                  x={node.x}
                  y={node.y + 48}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight={isSelected ? "600" : "500"}
                  fill="rgba(24, 24, 27, 0.95)"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.name}
                </text>
                
                {/* Resident count */}
                <text
                  x={node.x}
                  y={node.y + 64}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(99, 99, 110, 0.9)"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.residents.length
                    ? `${node.residents.length} resident${
                        node.residents.length === 1 ? "" : "s"
                      }`
                    : "no residents"}
                </text>
              </a>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 text-xs text-muted-foreground">
        <strong>Controls:</strong> Drag to pan • Scroll to zoom • Click nodes to
        navigate
      </div>
    </div>
  );
}
