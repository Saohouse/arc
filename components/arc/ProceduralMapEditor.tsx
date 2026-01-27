"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  pointsToPath,
  generateRoadPath,
  getLocationColors,
  hashString,
  seededRandom,
  type Point,
} from "@/lib/map-generation";

// =============================================================================
// TYPES
// =============================================================================

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

// Terrain decoration that can be placed
type TerrainDecoration = {
  id: string;
  type: 'tree' | 'treePine' | 'treeCluster' | 'rock' | 'mountain' | 'lake' | 'flowers';
  x: number;
  y: number;
  size: number;
  seed: number;
};

// Custom road drawn by user
type CustomRoad = {
  id: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  points: Point[]; // For freeform roads
  style: 'main' | 'path' | 'trail';
};

// Editor state saved to storage
type EditorData = {
  locationPositions: Record<string, { x: number; y: number }>;
  decorations: TerrainDecoration[];
  customRoads: CustomRoad[];
  mapSeed: number;
  disableProceduralTerrain: boolean; // If true, only show editor-placed decorations
};

type EditMode = 'view' | 'move' | 'decorate' | 'road' | 'delete';

interface ProceduralMapEditorProps {
  nodes: MapNode[];
  links: MapLink[];
  onClose?: () => void;
  onSave?: (data: EditorData) => void;
  initialData?: EditorData;
}

// =============================================================================
// TERRAIN DECORATION RENDERERS (SVG)
// =============================================================================

function TreeSVG({ x, y, size, variant = 0 }: { x: number; y: number; size: number; variant?: number }) {
  const isPine = variant % 2 === 1;
  
  if (isPine) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Trunk */}
        <rect x={-2} y={size * 0.1} width={4} height={size * 0.25} fill="#5D4037" />
        {/* Pine layers */}
        <polygon points={`0,${-size * 0.6} ${-size * 0.25},${size * 0.1} ${size * 0.25},${size * 0.1}`} fill="#1B5E20" />
        <polygon points={`0,${-size * 0.75} ${-size * 0.2},${-size * 0.2} ${size * 0.2},${-size * 0.2}`} fill="#2E7D32" />
        <polygon points={`0,${-size * 0.9} ${-size * 0.15},${-size * 0.45} ${size * 0.15},${-size * 0.45}`} fill="#388E3C" />
      </g>
    );
  }
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Trunk */}
      <rect x={-2} y={0} width={4} height={size * 0.3} fill="#5D4037" />
      {/* Foliage */}
      <ellipse cx={0} cy={-size * 0.3} rx={size * 0.35} ry={size * 0.3} fill="#1B5E20" />
      <ellipse cx={-size * 0.15} cy={-size * 0.35} rx={size * 0.25} ry={size * 0.22} fill="#2E7D32" />
      <ellipse cx={size * 0.1} cy={-size * 0.4} rx={size * 0.2} ry={size * 0.18} fill="#388E3C" />
    </g>
  );
}

function TreeClusterSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const trees: { tx: number; ty: number; tsize: number; variant: number }[] = [];
  const count = 3 + (seed % 3);
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + seededRandom(seed + i) * 0.5;
    const dist = size * 0.3 * (0.3 + seededRandom(seed + i + 10) * 0.7);
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist * 0.5;
    const tsize = size * (0.4 + seededRandom(seed + i + 20) * 0.4);
    trees.push({ tx, ty, tsize, variant: i });
  }
  
  // Sort by y for proper layering
  trees.sort((a, b) => a.ty - b.ty);
  
  return (
    <g>
      {trees.map((t, i) => (
        <TreeSVG key={i} x={x + t.tx} y={y + t.ty} size={t.tsize} variant={t.variant} />
      ))}
    </g>
  );
}

function RockSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const numRocks = 1 + (seed % 3);
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {numRocks > 1 && (
        <ellipse cx={size * 0.25} cy={-size * 0.05} rx={size * 0.32} ry={size * 0.22} fill="#616161" />
      )}
      {numRocks > 2 && (
        <ellipse cx={-size * 0.3} cy={size * 0.05} rx={size * 0.22} ry={size * 0.15} fill="#757575" />
      )}
      <ellipse cx={0} cy={0} rx={size * 0.4} ry={size * 0.28} fill="#757575" />
      <ellipse cx={-size * 0.1} cy={-size * 0.08} rx={size * 0.15} ry={size * 0.1} fill="#9E9E9E" opacity={0.6} />
    </g>
  );
}

function MountainSVG({ x, y, size }: { x: number; y: number; size: number }) {
  const h = size * 1.3;
  const hasSnow = size > 30;
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Main mountain */}
      <polygon points={`0,${-h} ${-size * 0.55},${size * 0.2} ${size * 0.55},${size * 0.2}`} fill="#616161" />
      {/* Shaded side */}
      <polygon points={`0,${-h} ${size * 0.55},${size * 0.2} ${size * 0.1},${size * 0.2} 0,${-h * 0.4}`} fill="#424242" />
      {/* Snow cap */}
      {hasSnow && (
        <polygon points={`0,${-h} ${-size * 0.18},${-h * 0.55} ${size * 0.18},${-h * 0.55}`} fill="#FAFAFA" />
      )}
    </g>
  );
}

function LakeSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const points: Point[] = [];
  const numPoints = 8;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = size * 0.5 * (0.7 + seededRandom(seed + i) * 0.5);
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.5,
    });
  }
  
  const pathD = pointsToPath(points.map(p => ({ x: p.x + x, y: p.y + y })), seed, 0);
  
  return (
    <g>
      {/* Shore */}
      <path 
        d={pathD} 
        fill="#D4A574" 
        transform={`translate(0, 0) scale(1.15)`}
        style={{ transformOrigin: `${x}px ${y}px` }}
        opacity={0.5}
      />
      {/* Water */}
      <path d={pathD} fill="#3B82F6" />
      {/* Highlight */}
      <ellipse cx={x - size * 0.1} cy={y - size * 0.05} rx={size * 0.15} ry={size * 0.05} fill="#93C5FD" opacity={0.6} />
    </g>
  );
}

function FlowersSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const flowers: { fx: number; fy: number; color: string }[] = [];
  const count = 3 + (seed % 4);
  const colors = ['#E91E63', '#FF5722', '#FFEB3B', '#9C27B0', '#03A9F4'];
  
  for (let i = 0; i < count; i++) {
    const fx = (seededRandom(seed + i * 10) - 0.5) * size;
    const fy = (seededRandom(seed + i * 20) - 0.5) * size * 0.5;
    const color = colors[(seed + i) % colors.length];
    flowers.push({ fx, fy, color });
  }
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {flowers.map((f, i) => (
        <g key={i} transform={`translate(${f.fx}, ${f.fy})`}>
          {/* Stem */}
          <line x1={0} y1={4} x2={0} y2={-2} stroke="#388E3C" strokeWidth={1} />
          {/* Petals */}
          {[0, 1, 2, 3, 4].map(p => (
            <circle
              key={p}
              cx={Math.cos((p / 5) * Math.PI * 2) * 3}
              cy={-4 + Math.sin((p / 5) * Math.PI * 2) * 3}
              r={2}
              fill={f.color}
            />
          ))}
          {/* Center */}
          <circle cx={0} cy={-4} r={2} fill="#FFC107" />
        </g>
      ))}
    </g>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const STORAGE_KEY = 'procedural-map-editor-data';

export function ProceduralMapEditor({
  nodes,
  links,
  onClose,
  onSave,
  initialData,
}: ProceduralMapEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // View state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Editor state
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [selectedDecorationType, setSelectedDecorationType] = useState<TerrainDecoration['type']>('tree');
  const [decorationSize, setDecorationSize] = useState(20);
  const [roadStyle, setRoadStyle] = useState<CustomRoad['style']>('main');
  
  // Map data - load from localStorage if no initialData provided
  const [mapSeed, setMapSeed] = useState(() => {
    if (initialData?.mapSeed !== undefined) return initialData.mapSeed;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).mapSeed || 0;
    } catch {}
    return 0;
  });
  const [locationPositions, setLocationPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (initialData?.locationPositions) return initialData.locationPositions;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).locationPositions || {};
    } catch {}
    return {};
  });
  const [decorations, setDecorations] = useState<TerrainDecoration[]>(() => {
    if (initialData?.decorations) return initialData.decorations as TerrainDecoration[];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).decorations || [];
    } catch {}
    return [];
  });
  const [customRoads, setCustomRoads] = useState<CustomRoad[]>(() => {
    if (initialData?.customRoads) return initialData.customRoads as CustomRoad[];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).customRoads || [];
    } catch {}
    return [];
  });
  
  // Control procedural terrain generation - default to true (only show editor decorations)
  const [disableProceduralTerrain, setDisableProceduralTerrain] = useState<boolean>(() => {
    if (initialData?.disableProceduralTerrain !== undefined) return initialData.disableProceduralTerrain as boolean;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Default to true if not set (new behavior: editor controls all terrain)
        return parsed.disableProceduralTerrain ?? true;
      }
    } catch {}
    return true; // Default: only show editor-placed decorations
  });
  
  // Dragging state
  const [draggedLocation, setDraggedLocation] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Road drawing state
  const [roadStartLocation, setRoadStartLocation] = useState<string | null>(null);
  
  
  // Hover state
  const [hoveredItem, setHoveredItem] = useState<{ type: 'location' | 'decoration' | 'road'; id: string } | null>(null);
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  
  // Update unsaved changes indicator when data changes
  useEffect(() => {
    const currentState = JSON.stringify({ locationPositions, decorations, customRoads, mapSeed, disableProceduralTerrain });
    if (lastSavedState && currentState !== lastSavedState) {
      setHasUnsavedChanges(true);
    }
  }, [locationPositions, decorations, customRoads, mapSeed, disableProceduralTerrain, lastSavedState]);
  
  // Set initial saved state on mount
  useEffect(() => {
    const currentState = JSON.stringify({ locationPositions, decorations, customRoads, mapSeed, disableProceduralTerrain });
    setLastSavedState(currentState);
  }, []); // Only on mount

  // Get position for a node (custom or original)
  const getNodePosition = useCallback((node: MapNode) => {
    return locationPositions[node.id] || { x: node.x, y: node.y };
  }, [locationPositions]);

  // Screen to SVG coordinate conversion
  const screenToSVG = (screenX: number, screenY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const rect = svg.getBoundingClientRect();
    const x = viewBox.x + ((screenX - rect.left) / rect.width) * viewBox.width;
    const y = viewBox.y + ((screenY - rect.top) / rect.height) * viewBox.height;
    return { x, y };
  };

  // Space key state for pan mode
  const [spaceHeld, setSpaceHeld] = useState(false);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setSpaceHeld(true);
          break;
        case 'Escape':
          onClose?.();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoom(0.8); // Zoom in
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoom(1.25); // Zoom out
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlePanBy(0, 50);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlePanBy(0, -50);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePanBy(50, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlePanBy(-50, 0);
          break;
        case '0':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            resetView();
          }
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpaceHeld(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onClose]);
  
  // Helper: Zoom by scale factor
  const handleZoom = (scaleFactor: number) => {
    setViewBox(prev => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;
      
      if (newWidth < 200 || newWidth > MAP_WIDTH * 3) return prev;
      
      // Zoom from center
      return {
        x: prev.x + (prev.width - newWidth) / 2,
        y: prev.y + (prev.height - newHeight) / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  };
  
  // Helper: Pan by pixel amount
  const handlePanBy = (dx: number, dy: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * scaleX,
      y: prev.y - dy * scaleY,
    }));
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Right click, middle click, or Space held = pan
    if (e.button === 2 || e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (e.button !== 0) return;
    
    const svgPoint = screenToSVG(e.clientX, e.clientY);
    
    if (editMode === 'decorate') {
      // Place decoration
      const newDeco: TerrainDecoration = {
        id: `deco-${Date.now()}`,
        type: selectedDecorationType,
        x: svgPoint.x,
        y: svgPoint.y,
        size: decorationSize,
        seed: Math.floor(Math.random() * 10000),
      };
      setDecorations(prev => [...prev, newDeco]);
    } else if (editMode === 'delete') {
      // Delete hovered item
      if (hoveredItem) {
        if (hoveredItem.type === 'decoration') {
          setDecorations(prev => prev.filter(d => d.id !== hoveredItem.id));
        } else if (hoveredItem.type === 'road') {
          setCustomRoads(prev => prev.filter(r => r.id !== hoveredItem.id));
        }
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      
      const svg = svgRef.current;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        setViewBox(prev => ({
          ...prev,
          x: prev.x - dx * scaleX,
          y: prev.y - dy * scaleY,
        }));
      }
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (draggedLocation && editMode === 'move') {
      const svgPoint = screenToSVG(e.clientX, e.clientY);
      setLocationPositions(prev => ({
        ...prev,
        [draggedLocation]: {
          x: svgPoint.x - dragOffset.x,
          y: svgPoint.y - dragOffset.y,
        },
      }));
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedLocation(null);
  };

  // Handle wheel - intelligent pan/zoom detection
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Detect if this is a pinch gesture or Ctrl/Cmd+scroll (zoom)
    // On Mac trackpad: pinch sets ctrlKey=true
    // On Windows: Ctrl+scroll for zoom
    const isZoom = e.ctrlKey || e.metaKey;
    
    if (isZoom) {
      // Zoom mode
      const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
      
      setViewBox(prev => {
        const newWidth = prev.width * scaleFactor;
        const newHeight = prev.height * scaleFactor;
        
        if (newWidth < 200 || newWidth > MAP_WIDTH * 3) return prev;
        
        const svg = svgRef.current;
        if (!svg) return prev;
        
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomPointX = prev.x + (mouseX / rect.width) * prev.width;
        const zoomPointY = prev.y + (mouseY / rect.height) * prev.height;
        
        return {
          x: zoomPointX - (mouseX / rect.width) * newWidth,
          y: zoomPointY - (mouseY / rect.height) * newHeight,
          width: newWidth,
          height: newHeight,
        };
      });
    } else {
      // Pan mode - two finger scroll on trackpad, or scroll wheel
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      
      // deltaX for horizontal scroll, deltaY for vertical
      setViewBox(prev => ({
        ...prev,
        x: prev.x + e.deltaX * scaleX,
        y: prev.y + e.deltaY * scaleY,
      }));
    }
  };

  // Handle location click/drag
  const handleLocationMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (editMode === 'move') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const pos = getNodePosition(node);
      const svgPoint = screenToSVG(e.clientX, e.clientY);
      
      setDraggedLocation(nodeId);
      setDragOffset({ x: svgPoint.x - pos.x, y: svgPoint.y - pos.y });
    } else if (editMode === 'road') {
      e.stopPropagation();
      if (!roadStartLocation) {
        setRoadStartLocation(nodeId);
      } else if (roadStartLocation !== nodeId) {
        // Create road between locations
        const newRoad: CustomRoad = {
          id: `road-${Date.now()}`,
          fromLocationId: roadStartLocation,
          toLocationId: nodeId,
          points: [],
          style: roadStyle,
        };
        setCustomRoads(prev => [...prev, newRoad]);
        setRoadStartLocation(null);
      }
    }
  };

  // Save status for UI feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Save data
  const handleSave = () => {
    setSaveStatus('saving');
    
    const data: EditorData = {
      locationPositions,
      decorations,
      customRoads,
      mapSeed,
      disableProceduralTerrain,
    };
    
    // Small delay to show saving state
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setLastSavedState(JSON.stringify(data));
        onSave?.(data);
        
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Failed to save:', e);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 300);
  };

  // Reset view
  const resetView = () => {
    setViewBox({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  };

  // Regenerate map
  const regenerate = () => {
    setMapSeed(prev => prev + 1);
  };

  // Clear all edits
  const clearEdits = () => {
    if (confirm('Clear all edits? This cannot be undone.')) {
      setLocationPositions({});
      setDecorations([]);
      setCustomRoads([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative">
      {/* Save notification toast */}
      <div 
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          saveStatus === 'saved' 
            ? 'opacity-100 translate-y-0' 
            : saveStatus === 'error'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className={`px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 ${
          saveStatus === 'saved' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {saveStatus === 'saved' && (
            <>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Changes saved successfully!</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Failed to save changes</span>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-2 bg-gray-800 border-b border-gray-700 flex-wrap">
        {/* Mode selector */}
        <div className="flex items-center gap-1 bg-gray-700 rounded p-1">
          {(['view', 'move', 'decorate', 'road', 'delete'] as EditMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setEditMode(mode);
                setRoadStartLocation(null);
              }}
              className={`px-3 py-1.5 rounded text-sm capitalize ${editMode === mode ? 'bg-indigo-600' : 'hover:bg-gray-600'}`}
            >
              {mode === 'view' ? '👁️' : mode === 'move' ? '✋' : mode === 'decorate' ? '🌳' : mode === 'road' ? '🛤️' : '🗑️'} {mode}
            </button>
          ))}
        </div>

        {/* Decoration options */}
        {editMode === 'decorate' && (
          <>
            <div className="h-6 w-px bg-gray-600" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Type:</span>
              {(['tree', 'treePine', 'treeCluster', 'rock', 'mountain', 'lake', 'flowers'] as TerrainDecoration['type'][]).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedDecorationType(type)}
                  className={`px-2 py-1 rounded text-xs ${selectedDecorationType === type ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {type === 'tree' ? '🌲' : type === 'treePine' ? '🌲' : type === 'treeCluster' ? '🌳🌳' : type === 'rock' ? '🪨' : type === 'mountain' ? '⛰️' : type === 'lake' ? '💧' : '🌸'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Size:</span>
              <input
                type="range"
                min={10}
                max={60}
                value={decorationSize}
                onChange={e => setDecorationSize(Number(e.target.value))}
                className="w-20 accent-indigo-500"
              />
              <span className="text-xs w-8">{decorationSize}</span>
            </div>
          </>
        )}

        {/* Road options */}
        {editMode === 'road' && (
          <>
            <div className="h-6 w-px bg-gray-600" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Style:</span>
              {(['main', 'path', 'trail'] as CustomRoad['style'][]).map(style => (
                <button
                  key={style}
                  onClick={() => setRoadStyle(style)}
                  className={`px-2 py-1 rounded text-xs capitalize ${roadStyle === style ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {style}
                </button>
              ))}
            </div>
            {roadStartLocation && (
              <span className="text-xs text-yellow-400">
                Click another location to connect
              </span>
            )}
          </>
        )}

        <div className="flex-1" />
        
        {/* Auto terrain toggle */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${!disableProceduralTerrain ? 'bg-blue-700' : 'bg-gray-700'}`}>
          <label className="text-xs cursor-pointer flex items-center gap-2" title="When enabled, the main map will auto-generate trees, rocks, mountains, etc. When disabled, only your manually placed decorations appear.">
            <input
              type="checkbox"
              checked={!disableProceduralTerrain}
              onChange={(e) => setDisableProceduralTerrain(!e.target.checked)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className={!disableProceduralTerrain ? 'text-white' : 'text-gray-300'}>
              Auto Terrain {!disableProceduralTerrain ? '(ON)' : '(OFF)'}
            </span>
          </label>
        </div>
        
        <div className="h-6 w-px bg-gray-600" />

        {/* View controls */}
        <button onClick={regenerate} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded" title="Regenerate shapes (new random seed)">
          🔄
        </button>
        <button onClick={() => handleZoom(0.8)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded" title="Zoom in (+)">
          ➕
        </button>
        <button onClick={() => handleZoom(1.25)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded" title="Zoom out (-)">
          ➖
        </button>
        <button onClick={resetView} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded" title="Reset view (Cmd/Ctrl+0)">
          🎯
        </button>
        <button onClick={clearEdits} className="p-1.5 bg-red-700 hover:bg-red-600 rounded" title="Clear all edits">
          🗑️
        </button>
        
        <div className="h-6 w-px bg-gray-600" />
        
        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && saveStatus === 'idle' && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Unsaved
          </span>
        )}
        
        <button 
          onClick={handleSave} 
          disabled={saveStatus === 'saving'}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 min-w-[90px] ${
            saveStatus === 'saving' 
              ? 'bg-gray-600 text-gray-300 cursor-wait' 
              : saveStatus === 'saved' 
                ? 'bg-emerald-500 text-white' 
                : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : hasUnsavedChanges
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Error
            </span>
          )}
          {saveStatus === 'idle' && '💾 Save'}
        </button>
        {onClose && (
          <button onClick={onClose} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm">
            Close
          </button>
        )}
      </div>

      {/* Main Map Area - simplified: just editing view with location markers */}
      <div className="flex-1 overflow-hidden bg-gray-950">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className={`w-full h-full ${
            isPanning ? 'cursor-grabbing' :
            spaceHeld ? 'cursor-grab' :
            editMode === 'move' ? 'cursor-grab' :
            editMode === 'decorate' ? 'cursor-crosshair' :
            editMode === 'delete' ? 'cursor-not-allowed' :
            'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={e => e.preventDefault()}
        >
          <defs>
            {/* Water pattern */}
            <pattern id="water-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect width="80" height="80" fill="#4A90D9" />
              <path d="M 0 20 Q 20 15, 40 20 T 80 20" stroke="#6BA3E0" strokeWidth="2" fill="none" opacity="0.4" />
              <path d="M 0 50 Q 20 45, 40 50 T 80 50" stroke="#6BA3E0" strokeWidth="2" fill="none" opacity="0.3" />
            </pattern>
          </defs>

          {/* Water background */}
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#water-pattern)" />
          
          {/* Note to user */}
          <text x={viewBox.x + viewBox.width/2} y={viewBox.y + 30} textAnchor="middle" fill="#6BA3E0" fontSize="14" opacity="0.7">
            Editor View - Click &quot;View Map&quot; to see final appearance with terrain
          </text>

          {/* Default roads from links */}
          {links.map((link, i) => {
            const fromPos = getNodePosition(link.from);
            const toPos = getNodePosition(link.to);
            const roadPath = generateRoadPath(fromPos, toPos, hashString(link.from.id + link.to.id), 0.3, 4);
            
            return (
              <g key={`road-${i}`} style={{ pointerEvents: 'none' }}>
                <path d={roadPath} stroke="rgba(0,0,0,0.2)" strokeWidth={8} fill="none" strokeLinecap="round" />
                <path d={roadPath} stroke="#8B7355" strokeWidth={6} fill="none" strokeLinecap="round" />
                <path d={roadPath} stroke="#FEF3C7" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeDasharray="10,10" opacity={0.5} />
              </g>
            );
          })}

          {/* Custom roads */}
          {customRoads.map(road => {
            if (!road.fromLocationId || !road.toLocationId) return null;
            const fromNode = nodes.find(n => n.id === road.fromLocationId);
            const toNode = nodes.find(n => n.id === road.toLocationId);
            if (!fromNode || !toNode) return null;
            
            const fromPos = getNodePosition(fromNode);
            const toPos = getNodePosition(toNode);
            const roadPath = generateRoadPath(fromPos, toPos, hashString(road.id), 0.25, 3);
            
            if (road.style === 'main') {
              return (
                <g key={road.id} style={{ pointerEvents: 'none' }}>
                  <path d={roadPath} stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
                  <path d={roadPath} stroke="#8B7355" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d={roadPath} stroke="#FEF3C7" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="10,10" opacity="0.6" />
                </g>
              );
            } else if (road.style === 'path') {
              return (
                <g key={road.id} style={{ pointerEvents: 'none' }}>
                  <path d={roadPath} stroke="rgba(0,0,0,0.15)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d={roadPath} stroke="#A09080" strokeWidth="4" fill="none" strokeLinecap="round" />
                </g>
              );
            } else {
              return (
                <g key={road.id} style={{ pointerEvents: 'none' }}>
                  <path d={roadPath} stroke="#90A080" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="8,4" />
                </g>
              );
            }
          })}

          {/* Manual decorations */}
          {decorations.map(deco => (
            <g key={deco.id} style={{ pointerEvents: 'none' }}>
              {deco.type === 'tree' && <TreeSVG x={deco.x} y={deco.y} size={deco.size} variant={0} />}
              {deco.type === 'treePine' && <TreeSVG x={deco.x} y={deco.y} size={deco.size} variant={1} />}
              {deco.type === 'treeCluster' && <TreeClusterSVG x={deco.x} y={deco.y} size={deco.size} seed={deco.seed} />}
              {deco.type === 'rock' && <RockSVG x={deco.x} y={deco.y} size={deco.size} seed={deco.seed} />}
              {deco.type === 'mountain' && <MountainSVG x={deco.x} y={deco.y} size={deco.size} />}
              {deco.type === 'lake' && <LakeSVG x={deco.x} y={deco.y} size={deco.size} seed={deco.seed} />}
              {deco.type === 'flowers' && <FlowersSVG x={deco.x} y={deco.y} size={deco.size} seed={deco.seed} />}
            </g>
          ))}

          {/* Editing UI Overlays - only show interactive elements for delete/hover modes */}
          {editMode === 'delete' && (
            <>
              {/* Highlight roads for deletion */}
              {customRoads.map(road => {
                if (!road.fromLocationId || !road.toLocationId) return null;
                const fromNode = nodes.find(n => n.id === road.fromLocationId);
                const toNode = nodes.find(n => n.id === road.toLocationId);
                if (!fromNode || !toNode) return null;
                
                const fromPos = getNodePosition(fromNode);
                const toPos = getNodePosition(toNode);
                const roadPath = generateRoadPath(fromPos, toPos, hashString(road.id), 0.25, 3);
                const isHovered = hoveredItem?.id === road.id;
                
                return (
                  <path
                    key={`delete-road-${road.id}`}
                    d={roadPath}
                    stroke={isHovered ? '#FF6B6B' : 'transparent'}
                    strokeWidth="12"
                    fill="none"
                    opacity={0.6}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredItem({ type: 'road', id: road.id })}
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                );
              })}
              
              {/* Highlight decorations for deletion */}
              {decorations.map(deco => (
                <circle
                  key={`delete-deco-${deco.id}`}
                  cx={deco.x}
                  cy={deco.y}
                  r={deco.size * 0.6}
                  fill={hoveredItem?.id === deco.id ? '#FF6B6B' : 'transparent'}
                  opacity={0.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredItem({ type: 'decoration', id: deco.id })}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              ))}
            </>
          )}

          {/* Location markers - ALWAYS VISIBLE */}
          {nodes.map(node => {
            const pos = getNodePosition(node);
            const isCountryOrProvince = node.locationType === 'country' || node.locationType === 'province';
            const iconSize = isCountryOrProvince ? 32 : 24;
            const isDragging = draggedLocation === node.id;
            const isRoadStart = roadStartLocation === node.id;
            const isHovered = hoveredItem?.id === node.id;
            
            return (
              <g key={node.id}>
                {/* Selection ring - show when dragging, road drawing, or hovering in move/road mode */}
                {(isDragging || isRoadStart || (isHovered && (editMode === 'move' || editMode === 'road'))) && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={iconSize + 8}
                    fill="none"
                    stroke={isRoadStart ? '#FFC107' : isDragging ? '#10B981' : '#6366F1'}
                    strokeWidth={3}
                    strokeDasharray="5,5"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                
                {/* Icon background */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={iconSize / 2 + 4}
                  fill="white"
                  stroke={node.locationType === 'city' ? '#F59E0B' : node.locationType === 'town' ? '#EC4899' : '#6366F1'}
                  strokeWidth={2}
                  style={{ 
                    cursor: editMode === 'move' ? (isDragging ? 'grabbing' : 'grab') : editMode === 'road' ? 'pointer' : 'default'
                  }}
                  onMouseDown={e => handleLocationMouseDown(e, node.id)}
                  onMouseEnter={() => setHoveredItem({ type: 'location', id: node.id })}
                  onMouseLeave={() => setHoveredItem(null)}
                />
                
                {/* Icon */}
                <text
                  x={pos.x}
                  y={pos.y + iconSize * 0.15}
                  textAnchor="middle"
                  fontSize={iconSize}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.iconData || (node.locationType === 'country' ? '🌍' : node.locationType === 'province' ? '🏛️' : node.locationType === 'city' ? '🏙️' : '🏘️')}
                </text>
                
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + iconSize / 2 + 18}
                  textAnchor="middle"
                  fontSize={isCountryOrProvince ? 14 : 11}
                  fontWeight="bold"
                  fill="white"
                  stroke="#000"
                  strokeWidth={3}
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name}
                </text>
              </g>
            );
          })}

          {/* Road drawing hint */}
          {editMode === 'road' && roadStartLocation && (
            <text
              x={600}
              y={30}
              textAnchor="middle"
              fontSize={14}
              fill="#FFC107"
              fontWeight="bold"
            >
              Click another location to create a road
            </text>
          )}
        </svg>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Mode: <span className="text-white">{editMode}</span></span>
          <span>Decorations: {decorations.length} | Roads: {customRoads.length}</span>
          {!disableProceduralTerrain && (
            <span className="text-blue-400">| Auto Terrain: ON</span>
          )}
          <span className="text-gray-500">| Click &quot;View Map&quot; to see final render</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500">|</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">Two-finger</kbd> Pan</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">Pinch</kbd> Zoom</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">Space</kbd>+Drag Pan</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">+/-</kbd> Zoom</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">Arrows</kbd> Pan</span>
        </div>
      </div>
    </div>
  );
}
