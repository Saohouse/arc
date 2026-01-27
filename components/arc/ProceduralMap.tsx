"use client";

import { useRef, useState, useEffect, useMemo, useCallback, MouseEvent, WheelEvent } from "react";
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

// Decoration type (from editor)
type TerrainDecoration = {
  id: string;
  type: 'tree' | 'treePine' | 'treeCluster' | 'rock' | 'mountain' | 'lake' | 'flowers';
  x: number;
  y: number;
  size: number;
  seed: number;
};

// Custom road type (from editor)
type CustomRoad = {
  id: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  points: { x: number; y: number }[];
  style: 'main' | 'path' | 'trail';
};

// Editor-specific types
type EditMode = 'view' | 'move' | 'decorate' | 'road' | 'delete';

type EditorData = {
  locationPositions: Record<string, { x: number; y: number }>;
  decorations: TerrainDecoration[];
  customRoads: CustomRoad[];
  mapSeed: number;
  disableProceduralTerrain: boolean;
};

const STORAGE_KEY = 'procedural-map-editor-data';

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
      <ellipse cx={0} cy={0} rx={size * 0.4} ry={size * 0.25} fill="#9E9E9E" />
      <ellipse cx={-size * 0.1} cy={-size * 0.05} rx={size * 0.15} ry={size * 0.08} fill="#BDBDBD" />
    </g>
  );
}

function MountainSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const peaks = 2 + (seed % 2);
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Main peak */}
      <polygon points={`0,${-size * 0.8} ${-size * 0.5},0 ${size * 0.5},0`} fill="#546E7A" />
      <polygon points={`0,${-size * 0.8} ${-size * 0.3},${-size * 0.2} ${size * 0.3},${-size * 0.2}`} fill="#607D8B" />
      {/* Snow cap */}
      <polygon points={`0,${-size * 0.8} ${-size * 0.15},${-size * 0.45} ${size * 0.15},${-size * 0.45}`} fill="#ECEFF1" />
      {peaks > 2 && (
        <polygon points={`${size * 0.4},${-size * 0.5} ${size * 0.2},0 ${size * 0.6},0`} fill="#546E7A" />
      )}
    </g>
  );
}

function LakeSVG({ x, y, size, seed }: { x: number; y: number; size: number; seed: number }) {
  const points: Point[] = [];
  const numPoints = 6 + (seed % 4);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = size * (0.4 + seededRandom(seed + i) * 0.15);
    points.push({
      x: x + Math.cos(angle) * r,
      y: y + Math.sin(angle) * r * 0.6,
    });
  }
  
  const pathD = pointsToPath(points, seed);
  
  return (
    <g>
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

function renderDecoration(deco: TerrainDecoration) {
  const { type, x, y, size, seed } = deco;
  
  switch (type) {
    case 'tree':
    case 'treePine':
      return <TreeSVG key={deco.id} x={x} y={y} size={size} variant={seed % 2} />;
    case 'treeCluster':
      return <TreeClusterSVG key={deco.id} x={x} y={y} size={size} seed={seed} />;
    case 'rock':
      return <RockSVG key={deco.id} x={x} y={y} size={size} seed={seed} />;
    case 'mountain':
      return <MountainSVG key={deco.id} x={x} y={y} size={size} seed={seed} />;
    case 'lake':
      return <LakeSVG key={deco.id} x={x} y={y} size={size} seed={seed} />;
    case 'flowers':
      return <FlowersSVG key={deco.id} x={x} y={y} size={size} seed={seed} />;
    default:
      return null;
  }
}

type ProceduralMapProps = {
  nodes: MapNode[];
  links: MapLink[];
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  // Editor-provided overrides
  customPositions?: Record<string, { x: number; y: number }>;
  customDecorations?: unknown[];
  customRoads?: unknown[];
  mapSeedOverride?: number;
  disableProceduralTerrain?: boolean;
  // Edit mode
  editMode?: boolean;
  onExitEditMode?: () => void;
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

export function ProceduralMap({ 
  nodes, 
  links, 
  isMaximized = false, 
  onToggleMaximize,
  customPositions,
  customDecorations,
  customRoads,
  mapSeedOverride,
  disableProceduralTerrain = false,
  editMode = false,
  onExitEditMode,
}: ProceduralMapProps) {
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
  const [mapSeed, setMapSeed] = useState(mapSeedOverride || 0); // For regeneration
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [labelOffsets, setLabelOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [terrainFeatures, setTerrainFeatures] = useState<TerrainFeature[]>([]);
  
  // ========== EDITOR STATE ==========
  const [internalEditMode, setInternalEditMode] = useState<EditMode>('view');
  const [selectedDecorationType, setSelectedDecorationType] = useState<TerrainDecoration['type']>('tree');
  const [decorationSize, setDecorationSize] = useState(20);
  const [roadStyle, setRoadStyle] = useState<CustomRoad['style']>('main');
  const [localLocationPositions, setLocalLocationPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [localDecorations, setLocalDecorations] = useState<TerrainDecoration[]>([]);
  const [localCustomRoads, setLocalCustomRoads] = useState<CustomRoad[]>([]);
  const [localDisableProceduralTerrain, setLocalDisableProceduralTerrain] = useState(false);
  const [draggedLocation, setDraggedLocation] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [roadStartLocation, setRoadStartLocation] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ type: 'location' | 'decoration' | 'road'; id: string } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState('');
  
  // Update mapSeed when override changes
  useEffect(() => {
    if (mapSeedOverride !== undefined) {
      setMapSeed(mapSeedOverride);
    }
  }, [mapSeedOverride]);
  
  // ========== EDITOR DATA LOADING/SYNC ==========
  // Load editor data from localStorage on mount
  useEffect(() => {
    if (!editMode) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: EditorData = JSON.parse(saved);
        setLocalLocationPositions(data.locationPositions || {});
        setLocalDecorations(data.decorations || []);
        setLocalCustomRoads(data.customRoads || []);
        setMapSeed(data.mapSeed || 0);
        setLocalDisableProceduralTerrain(data.disableProceduralTerrain ?? false);
        setLastSavedState(JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to load editor data:', e);
    }
  }, [editMode]);
  
  // Track unsaved changes
  useEffect(() => {
    if (!editMode) return;
    const currentState = JSON.stringify({
      locationPositions: localLocationPositions,
      decorations: localDecorations,
      customRoads: localCustomRoads,
      mapSeed,
      disableProceduralTerrain: localDisableProceduralTerrain,
    });
    if (lastSavedState && currentState !== lastSavedState) {
      setHasUnsavedChanges(true);
    }
  }, [editMode, localLocationPositions, localDecorations, localCustomRoads, mapSeed, localDisableProceduralTerrain, lastSavedState]);
  
  // Create a stable key for customPositions to prevent unnecessary re-renders
  const customPositionsKey = useMemo(() => {
    if (!customPositions) return '';
    return JSON.stringify(customPositions);
  }, [customPositions]);
  
  // Track ALL location positions for real-time border updates
  const localPositionsKey = useMemo(() => {
    if (!editMode) return '';
    return JSON.stringify(localLocationPositions);
  }, [editMode, localLocationPositions]);
  
  
  // Helper to get node position - prioritizes editor customPositions, then auto-repositioned, then original
  const getNodePos = useCallback((nodeId: string, node: { x: number; y: number }) => {
    // In edit mode, use local positions
    if (editMode && localLocationPositions[nodeId]) {
      return localLocationPositions[nodeId];
    }
    // Editor custom positions take priority
    if (customPositions?.[nodeId]) {
      return customPositions[nodeId];
    }
    // Auto-repositioned positions (for coastal cities)
    if (nodePositions.has(nodeId)) {
      return nodePositions.get(nodeId)!;
    }
    // Original position
    return { x: node.x, y: node.y };
  }, [editMode, localLocationPositions, customPositions, nodePositions]);
  
  // ========== EDITOR HELPERS ==========
  // Screen to SVG coordinate conversion
  const screenToSVG = useCallback((screenX: number, screenY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const rect = svg.getBoundingClientRect();
    const x = viewBox.x + ((screenX - rect.left) / rect.width) * viewBox.width;
    const y = viewBox.y + ((screenY - rect.top) / rect.height) * viewBox.height;
    return { x, y };
  }, [viewBox]);
  
  // Save editor data
  const handleSaveEditor = useCallback(() => {
    setSaveStatus('saving');
    
    const data: EditorData = {
      locationPositions: localLocationPositions,
      decorations: localDecorations,
      customRoads: localCustomRoads,
      mapSeed,
      disableProceduralTerrain: localDisableProceduralTerrain,
    };
    
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setLastSavedState(JSON.stringify(data));
        
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (e) {
        console.error('Failed to save:', e);
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    }, 300);
  }, [localLocationPositions, localDecorations, localCustomRoads, mapSeed, localDisableProceduralTerrain]);
  
  // Regenerate map seed
  const handleRegenerate = useCallback(() => {
    setMapSeed(Date.now());
  }, []);
  
  // Shape params - use defaults (editing is done in editor)
  const shapeParams = defaultParams;

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

  // ========== TERRAIN GENERATION (WORLD-FIXED) ==========
  // Generate terrain ONCE based on world coordinates - independent of location positions
  // This ensures terrain stays fixed when you move locations around
  useEffect(() => {
    const terrain: TerrainFeature[] = [];
    const terrainSeed = mapSeed * 1000 + 42;
    
    // Get the country shapes for boundary checking (use ORIGINAL positions for terrain bounds)
    const countries = nodes.filter((n) => n.locationType === "country");
    
    // Calculate fixed country bounds based on original positions (not custom positions)
    // This keeps terrain stable even when locations are moved
    const countryBounds: Point[][] = [];
    countries.forEach((country) => {
      const seed = hashString(country.id) + mapSeed;
      const maxDistance = 250; // Fixed size for terrain generation
      const numSides = 20;
      const points: Point[] = [];
      
      for (let i = 0; i < numSides; i++) {
        const angle = (i / numSides) * Math.PI * 2;
        const radius = maxDistance * (0.9 + seededRandom(seed + i) * 0.2);
        points.push({
          x: country.x + Math.cos(angle) * radius,
          y: country.y + Math.sin(angle) * radius,
        });
      }
      countryBounds.push(points);
    });
    
    // Helper to check if point is inside any country (using fixed bounds)
    const isInsideLand = (x: number, y: number): boolean => {
      return countryBounds.some(shape => isPointInPolygon(x, y, shape));
    };
    
    // Helper to check distance from roads (using ORIGINAL node positions)
    const getDistanceFromRoads = (px: number, py: number): number => {
      let minDist = Infinity;
      links.forEach(link => {
        // Use original positions for road distance calculation
        const fromPos = { x: link.from.x, y: link.from.y };
        const toPos = { x: link.to.x, y: link.to.y };
        
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
    
    // Generate terrain based on fixed world bounds (skip if disabled)
    const shouldDisableTerrain = editMode ? localDisableProceduralTerrain : disableProceduralTerrain;
    if (countryBounds.length > 0 && !shouldDisableTerrain) {
      // Get overall bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      countryBounds.forEach(shape => {
        shape.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      });
      
      // Grid-based placement for even distribution
      const gridSize = 50;
      
      for (let gx = minX; gx < maxX; gx += gridSize) {
        for (let gy = minY; gy < maxY; gy += gridSize) {
          // Use WORLD COORDINATES for seeding - this keeps terrain fixed
          const cellSeed = terrainSeed + Math.floor(gx) * 100 + Math.floor(gy);
          const offsetX = (seededRandom(cellSeed) - 0.5) * gridSize * 0.8;
          const offsetY = (seededRandom(cellSeed + 1) - 0.5) * gridSize * 0.8;
          const px = gx + offsetX;
          const py = gy + offsetY;
          
          // Skip if not inside land
          if (!isInsideLand(px, py)) continue;
          
          // Skip if too close to a node (use ORIGINAL positions)
          const nodeMinDist = 45;
          let tooClose = false;
          for (const node of nodes) {
            const dx = px - node.x; // Use original position
            const dy = py - node.y;
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
              terrain.push({
                type: 'forest',
                x: px,
                y: py,
                size: 15 + sizeRoll * 15,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.45) {
              terrain.push({
                type: 'tree',
                x: px,
                y: py,
                size: 10 + sizeRoll * 8,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.52) {
              terrain.push({
                type: 'mountain',
                x: px,
                y: py,
                size: 20 + sizeRoll * 25,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.56) {
              terrain.push({
                type: 'lake',
                x: px,
                y: py,
                size: 15 + sizeRoll * 20,
                seed: cellSeed,
                variant: variantRoll,
              });
            } else if (featureRoll < 0.62) {
              terrain.push({
                type: 'rock',
                x: px,
                y: py,
                size: 5 + sizeRoll * 6,
                seed: cellSeed,
                variant: variantRoll,
              });
            }
          }
        }
      }
    }
    
    setTerrainFeatures(terrain);
  }, [nodes, links, mapSeed, disableProceduralTerrain, editMode, localDisableProceduralTerrain]); // Only regenerate when seed or disable flag changes

  // ========== REGION/BORDER GENERATION (DYNAMIC) ==========
  // Generate region borders that update when locations are moved
  useEffect(() => {
    const generatedRegions: Region[] = [];
    
    // Find all countries and provinces
    const countries = nodes.filter((n) => n.locationType === "country");
    const provinces = nodes.filter((n) => n.locationType === "province");
    
    // Helper to get position - prioritizes custom positions from editor
    const getPos = (node: MapNode) => {
      // In edit mode, use local positions first
      if (editMode && localLocationPositions[node.id]) {
        return localLocationPositions[node.id];
      }
      // Otherwise use custom positions from props or original
      return customPositions?.[node.id] || { x: node.x, y: node.y };
    };
    
    // Generate country regions - sized to contain all provinces
    const countryRegionsMap = new Map<string, Region>();
    countries.forEach((country) => {
      const seed = hashString(country.id) + mapSeed; // Use mapSeed for variation
      const countryPos = getPos(country);
      
      // Find children (provinces in this country)
      const children = provinces.filter((p) => p.parentLocationId === country.id);
      
      // Find all cities/towns in this country (through provinces)
      const provinceIds = children.map(p => p.id);
      const citiesInCountry = nodes.filter(
        (n) => (n.locationType === "city" || n.locationType === "town") && 
               provinceIds.includes(n.parentLocationId || "")
      );
      
      // Calculate radius to encompass all children AND cities
      let maxDistance = 200; // Default minimum
      if (children.length > 0) {
        children.forEach((child) => {
          const childPos = getPos(child);
          const dx = childPos.x - countryPos.x;
          const dy = childPos.y - countryPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          maxDistance = Math.max(maxDistance, distance + 150); // Add padding around provinces
        });
      }
      
      // Also check cities/towns - but DON'T expand maxDistance for them!
      // Cities will create localized bulges instead of uniform expansion
      // citiesInCountry.forEach((city) => {
      //   const cityPos = getPos(city);
      //   const dx = cityPos.x - countryPos.x;
      //   const dy = cityPos.y - countryPos.y;
      //   const distance = Math.sqrt(dx * dx + dy * dy);
      //   maxDistance = Math.max(maxDistance, distance + 100); // REMOVED: causes uniform expansion
      // });
      
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
            const baseRadius = maxDistance * radiusVariation;
            
            // Check for city bulges in this direction
            let maxBulge = 0;
            citiesInCountry.forEach((city) => {
              const cityPos = getPos(city);
              const dx = cityPos.x - countryPos.x;
              const dy = cityPos.y - countryPos.y;
              const distToCity = Math.sqrt(dx * dx + dy * dy);
              
              if (distToCity < 10) return;
              
              const angleToCity = Math.atan2(dy, dx);
              let angleDiff = subAngle - angleToCity;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              const absAngleDiff = Math.abs(angleDiff);
              
              // Wide cone for country (80 degrees = 1.4 radians)
              if (absAngleDiff < 1.4) {
                const targetRadius = distToCity + 80; // Reduced from 100
                if (targetRadius > maxDistance) {
                  const bulgeAmount = targetRadius - maxDistance;
                  
                  let bulgeFactor;
                  if (absAngleDiff < 0.35) {
                    bulgeFactor = 1.0;
                  } else if (absAngleDiff < 0.87) {
                    const t = (absAngleDiff - 0.35) / (0.87 - 0.35);
                    bulgeFactor = 1.0 - (t * 0.6);
                  } else {
                    const t = (absAngleDiff - 0.87) / (1.4 - 0.87);
                    bulgeFactor = 0.4 * (1 - t);
                  }
                  
                  maxBulge = Math.max(maxBulge, bulgeAmount * bulgeFactor);
                }
              }
            });
            
            const radius = maxBulge > 0 ? (maxDistance + maxBulge) : baseRadius;
            
            // Slight perpendicular offset for natural straight lines
            const perpOffset = (seededRandom(sectionSeed + j * 97) - 0.5) * 15;
            
            countryPoints.push({
              x: countryPos.x + Math.cos(subAngle) * radius + Math.cos(subAngle + Math.PI/2) * perpOffset,
              y: countryPos.y + Math.sin(subAngle) * radius + Math.sin(subAngle + Math.PI/2) * perpOffset,
            });
          }
        } else {
          // Organic section: single point with more variation for curves (use params)
          const angleJitter = (seededRandom(sectionSeed + 200) - 0.5) * shapeParams.countryAngleJitter;
          const angle = baseAngle + angleJitter;
          const radiusRange = shapeParams.countryOrganicRadiusMax - shapeParams.countryOrganicRadiusMin;
          const radiusVariation = shapeParams.countryOrganicRadiusMin + seededRandom(sectionSeed + 137) * radiusRange;
          const baseRadius = maxDistance * radiusVariation;
          
          // Check for city bulges in this direction
          let maxBulge = 0;
          citiesInCountry.forEach((city) => {
            const cityPos = getPos(city);
            const dx = cityPos.x - countryPos.x;
            const dy = cityPos.y - countryPos.y;
            const distToCity = Math.sqrt(dx * dx + dy * dy);
            
            if (distToCity < 10) return;
            
            const angleToCity = Math.atan2(dy, dx);
            let angleDiff = angle - angleToCity;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            const absAngleDiff = Math.abs(angleDiff);
            
            // Wide cone for country (80 degrees = 1.4 radians)
            if (absAngleDiff < 1.4) {
              const targetRadius = distToCity + 80; // Reduced from 100
              if (targetRadius > maxDistance) {
                const bulgeAmount = targetRadius - maxDistance;
                
                let bulgeFactor;
                if (absAngleDiff < 0.35) {
                  bulgeFactor = 1.0;
                } else if (absAngleDiff < 0.87) {
                  const t = (absAngleDiff - 0.35) / (0.87 - 0.35);
                  bulgeFactor = 1.0 - (t * 0.6);
                } else {
                  const t = (absAngleDiff - 0.87) / (1.4 - 0.87);
                  bulgeFactor = 0.4 * (1 - t);
                }
                
                maxBulge = Math.max(maxBulge, bulgeAmount * bulgeFactor);
              }
            }
          });
          
          const radius = maxBulge > 0 ? (maxDistance + maxBulge) : baseRadius;
          
          countryPoints.push({
            x: countryPos.x + Math.cos(angle) * radius,
            y: countryPos.y + Math.sin(angle) * radius,
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
    
    // Group coastal cities by province for better spacing
    const coastalCitiesByProvince = new Map<string, typeof nodes>();
    nodes.forEach((node) => {
      if ((node.locationType === "city" || node.locationType === "town") && node.parentLocationId) {
        const isCoastal = isCoastalLocation(node.summary, node.overview, node.tags);
        if (isCoastal) {
          const existing = coastalCitiesByProvince.get(node.parentLocationId) || [];
          existing.push(node);
          coastalCitiesByProvince.set(node.parentLocationId, existing);
        }
      }
    });
    
    // Position coastal cities with spacing
    coastalCitiesByProvince.forEach((cities, provinceId) => {
      const province = nodes.find((n) => n.id === provinceId);
      if (!province || !province.parentLocationId) return;
      
      const countryRegion = countryRegionsMap.get(province.parentLocationId);
      if (!countryRegion) return;
      
      const country = countryRegion.node;
      const provincePos = getPos(province);
      
      // Calculate base direction from country center toward the province
      const baseDirX = provincePos.x - country.x;
      const baseDirY = provincePos.y - country.y;
      const baseAngle = Math.atan2(baseDirY, baseDirX);
      
      // Spread cities along an arc (±40 degrees from base direction)
      const arcSpread = Math.PI / 4.5; // ~40 degrees total spread
      const numCities = cities.length;
      
      cities.forEach((city, index) => {
        // Distribute cities evenly across the arc
        const offsetAngle = numCities > 1 
          ? (index / (numCities - 1) - 0.5) * arcSpread 
          : 0;
        const cityAngle = baseAngle + offsetAngle;
        
        const dirX = Math.cos(cityAngle);
        const dirY = Math.sin(cityAngle);
        
        // Find the actual boundary point in this direction
        const boundaryPoint = findBoundaryPoint(
          country.x,
          country.y,
          dirX,
          dirY,
          countryRegion.shape
        );
        
        if (boundaryPoint) {
          // Position city slightly inside the boundary
          const insetFactor = 0.90; // 90% of the way to boundary
          const newX = country.x + (boundaryPoint.x - country.x) * insetFactor;
          const newY = country.y + (boundaryPoint.y - country.y) * insetFactor;
          
          repositionedNodes.set(city.id, { x: newX, y: newY });
        }
      });
    });
    
    // Generate province regions using Voronoi-like territory allocation
    // Each province extends toward the midpoint between itself and neighbors
    
    // Helper for province generation that includes repositioned coastal cities
    // IMPORTANT: Editor positions take priority over coastal repositioning
    const getPosWithCoastal = (node: MapNode) => {
      // 1. HIGHEST PRIORITY: Editor positions (when manually moving locations)
      if (editMode && localLocationPositions[node.id]) {
        return localLocationPositions[node.id];
      }
      // 2. Custom positions from props
      if (customPositions?.[node.id]) {
        return customPositions[node.id];
      }
      // 3. Coastal repositioning (automatic placement)
      if (repositionedNodes.has(node.id)) {
        return repositionedNodes.get(node.id)!;
      }
      // 4. Original position
      return { x: node.x, y: node.y };
    };
    
    // First, calculate territory boundaries for each province
    const provinceShapes = new Map<string, Point[]>();
    
    provinces.forEach((province) => {
      const seed = hashString(province.id) + mapSeed;
      const provincePos = getPosWithCoastal(province);
      
      // Find sibling provinces (same parent country)
      const siblings = provinces.filter(
        (p) => p.id !== province.id && p.parentLocationId === province.parentLocationId
      );
      
      // Find children (cities/towns in this province)
      const children = nodes.filter(
        (n) => (n.locationType === "city" || n.locationType === "town") && n.parentLocationId === province.id
      );
      
      // Get the parent country shape for boundary clipping
      const parentCountry = province.parentLocationId 
        ? countryRegionsMap.get(province.parentLocationId) 
        : null;
      
      // Generate points around the province, but limit by neighbors and country boundary
      // Province generation with angular/organic mix (like country borders)
      // Use shapeParams for adjustable values
      // High number of sections (32-44) for very responsive city border wrapping
      const numSections = (shapeParams.provinceSides + 20) + Math.floor(seededRandom(seed) * 12);
      const points: Point[] = [];
      const provAngularThreshold = Math.floor(shapeParams.provinceAngularPercent / 10);
      
      // Helper to calculate limited radius for a given angle
      // Direct approach: Extend border to fully wrap around ALL cities
      const calculateRadius = (angle: number, seedOffset: number, isAngular: boolean) => {
        // STEP 1: Calculate base radius for THIS angle (with organic variation)
        const baseRadius = 90;
        const radiusMin = isAngular ? shapeParams.provinceAngularRadiusMin : shapeParams.provinceOrganicRadiusMin;
        const radiusMax = isAngular ? shapeParams.provinceAngularRadiusMax : shapeParams.provinceOrganicRadiusMax;
        const radiusVariation = radiusMin + seededRandom(seed + seedOffset) * (radiusMax - radiusMin);
        
        // CRITICAL: Use a FIXED base for bulge calculations (not the varied one)
        // The variation should only apply to areas WITHOUT cities
        const fixedBaseRadius = 90; // Fixed base for all angles when calculating bulges
        const variedRadius = Math.max(50, baseRadius * radiusVariation); // Organic variation
        
        // Track if we extended for cities (so we don't shrink later)
        let extendedForCities = false;
        let maxBulgeForThisAngle = 0; // Track the largest bulge needed for THIS angle
        
        // Create LOCALIZED bulges for each city (not expand entire province)
        // Calculate the bulge for THIS specific angle only
        children.forEach((city) => {
          const cityPos = getPosWithCoastal(city);
          const dx = cityPos.x - provincePos.x;
          const dy = cityPos.y - provincePos.y;
          const distToCity = Math.sqrt(dx * dx + dy * dy);
          
          if (distToCity < 10) return; // Skip if city is at province center
          
          const angleToCity = Math.atan2(dy, dx);
          
          // Calculate angular difference, handling wraparound
          let angleDiff = angle - angleToCity;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          const absAngleDiff = Math.abs(angleDiff);
          
          // VERY NARROW cone - 50 degrees (~0.87 radians) for an ultra-focused bulge
          // This creates a tiny "bump" only directly toward the city
          const coneAngle = 0.70; // Reduced from 0.87 (40 degrees instead of 50)
          
          if (absAngleDiff < coneAngle) {
            // Calculate how much we need to bulge OUT from the FIXED base
            const padding = 40; // Reduced from 60 for subtler bulges
            const targetRadius = distToCity + padding;
            
            // Only bulge if city is beyond the fixed base radius
            if (targetRadius > fixedBaseRadius) {
              const bulgeAmount = targetRadius - fixedBaseRadius;
              
              // SUPER aggressive falloff: only angles directly at city get full bulge
              let bulgeFactor;
              if (absAngleDiff < 0.17) {
                // Within 10 degrees - full bulge (1.0)
                bulgeFactor = 1.0;
              } else if (absAngleDiff < 0.52) {
                // 10-30 degrees - steep falloff (1.0 -> 0.2)
                const t = (absAngleDiff - 0.17) / (0.52 - 0.17);
                bulgeFactor = 1.0 - (t * 0.8);
              } else {
                // 30-50 degrees - rapid falloff to zero (0.2 -> 0)
                const t = (absAngleDiff - 0.52) / (coneAngle - 0.52);
                bulgeFactor = 0.2 * (1 - t);
              }
              
              // Calculate the scaled bulge for THIS angle from THIS city
              const thisAngleBulge = bulgeAmount * bulgeFactor;
              
              // Track the MAXIMUM bulge needed for this angle (from any city)
              // This prevents one city's bulge from affecting angles toward other cities
              if (thisAngleBulge > maxBulgeForThisAngle) {
                maxBulgeForThisAngle = thisAngleBulge;
                extendedForCities = true;
              }
            }
          }
        });
        
        // Start with varied radius for organic shape
        // Then add bulge ONLY if we have cities in this direction
        let radius;
        if (maxBulgeForThisAngle > 0) {
          // Have bulge: use fixed base + bulge (ignore variation for peninsula)
          radius = fixedBaseRadius + maxBulgeForThisAngle;
        } else {
          // No bulge: use organic varied radius
          radius = variedRadius;
        }
        
        const provinceBaseRadius = fixedBaseRadius; // For later calculations
        
        // STEP 2: VORONOI-STYLE BORDER (True push/pull without overlap)
        // Calculate Voronoi boundary: find closest perpendicular bisector with siblings
        
        // Ray direction from province center
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);
        
        let voronoiLimit = Infinity;
        
        siblings.forEach((sibling) => {
          const siblingPos = getPos(sibling);
          const dxToSibling = siblingPos.x - provincePos.x;
          const dyToSibling = siblingPos.y - provincePos.y;
          const distToSibling = Math.sqrt(dxToSibling * dxToSibling + dyToSibling * dyToSibling);
          
          if (distToSibling < 5) return;
          
          // Calculate where our ray intersects the perpendicular bisector
          // The perpendicular bisector is all points equidistant from us and sibling
          // For a ray from our center, we need to find where |point - us| = |point - sibling|
          
          // Midpoint between us and sibling (lies on perpendicular bisector)
          const midX = provincePos.x + dxToSibling * 0.5;
          const midY = provincePos.y + dyToSibling * 0.5;
          
          // Vector from our center to midpoint
          const toMidX = midX - provincePos.x;
          const toMidY = midY - provincePos.y;
          
          // Project midpoint onto ray direction to find intersection distance
          // This gives us the Voronoi boundary distance in this direction
          const projection = (toMidX * rayDirX + toMidY * rayDirY);
          
          // Only consider if sibling is somewhat in this direction (within 120 degrees)
          const angleToSibling = Math.atan2(dyToSibling, dxToSibling);
          let angleDiff = angle - angleToSibling;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          const absAngleDiff = Math.abs(angleDiff);
          
          // Only apply if sibling is relevant (within 120 degrees, ~2.09 radians)
          if (absAngleDiff < 2.09 && projection > 0) {
            // Check if sibling has cities (to allow some flexibility)
            const siblingChildren = nodes.filter(n => 
              n.parentLocationId === sibling.id && 
              (n.locationType === 'city' || n.locationType === 'town')
            );
            const siblingHasCities = siblingChildren.length > 0;
            
            // Adjust Voronoi boundary based on city presence
            let adjustedLimit = projection;
            
            if (extendedForCities && !siblingHasCities) {
              // We have cities, sibling doesn't: push boundary 15% toward sibling
              adjustedLimit = projection + (projection * 0.15);
            } else if (!extendedForCities && siblingHasCities) {
              // Sibling has cities, we don't: pull boundary 15% away from sibling
              adjustedLimit = projection - (projection * 0.15);
            }
            // If both or neither have cities, use exact Voronoi (no adjustment)
            
            // Small safety margin to prevent floating point overlap
            adjustedLimit -= 10;
            
            voronoiLimit = Math.min(voronoiLimit, adjustedLimit);
          }
        });
        
        // Apply Voronoi limit (but allow reaching cities if needed)
        if (voronoiLimit < Infinity) {
          // Calculate minimum needed for cities AT THIS SPECIFIC ANGLE ONLY
          let minRadiusForCities = 0;
          if (extendedForCities) {
            children.forEach((city) => {
              const cityPos = getPosWithCoastal(city);
              const dx = cityPos.x - provincePos.x;
              const dy = cityPos.y - provincePos.y;
              const distToCity = Math.sqrt(dx * dx + dy * dy);
              
              if (distToCity < 10) return;
              
              const angleToCity = Math.atan2(dy, dx);
              let angleDiff = angle - angleToCity;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              const absAngleDiff = Math.abs(angleDiff);
              
              // Use SAME narrow cone as bulge calculation (40 degrees = 0.70 radians)
              // Only protect radius if THIS angle is directly toward the city
              if (absAngleDiff < 0.70) { // Changed from 0.87
                const neededRadius = distToCity + 40; // Reduced from 60
                
                // Apply same falloff as bulge calculation
                let protectionFactor;
                if (absAngleDiff < 0.17) {
                  protectionFactor = 1.0;
                } else if (absAngleDiff < 0.52) {
                  const t = (absAngleDiff - 0.17) / (0.52 - 0.17);
                  protectionFactor = 1.0 - (t * 0.8);
                } else {
                  const t = (absAngleDiff - 0.52) / (0.70 - 0.52); // Changed from 0.87
                  protectionFactor = 0.2 * (1 - t);
                }
                
                const protectedRadius = provinceBaseRadius + ((neededRadius - provinceBaseRadius) * protectionFactor);
                minRadiusForCities = Math.max(minRadiusForCities, protectedRadius);
              }
            });
          }
          
          // Use the larger of Voronoi limit or city requirement
          const effectiveLimit = Math.max(voronoiLimit, minRadiusForCities);
          radius = Math.min(radius, effectiveLimit);
        }
        
        // STEP 3: Limit by country boundary (can't extend outside parent country)
        // BUT: Allow coastal cities to create peninsulas that reach the coast
        if (parentCountry) {
          const boundaryPoint = findBoundaryPoint(
            provincePos.x, provincePos.y,
            Math.cos(angle), Math.sin(angle),
            parentCountry.shape
          );
          if (boundaryPoint) {
            const distToBoundary = Math.sqrt(
              Math.pow(boundaryPoint.x - provincePos.x, 2) + 
              Math.pow(boundaryPoint.y - provincePos.y, 2)
            );
            
            // Check if there's a coastal city in this direction
            let hasCoastalCity = false;
            children.forEach((city) => {
              const cityPos = getPosWithCoastal(city);
              const dx = cityPos.x - provincePos.x;
              const dy = cityPos.y - provincePos.y;
              const distToCity = Math.sqrt(dx * dx + dy * dy);
              
              if (distToCity < 10) return;
              
              const angleToCity = Math.atan2(dy, dx);
              let angleDiff = angle - angleToCity;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              const absAngleDiff = Math.abs(angleDiff);
              
              // Check if city is in this direction (within cone)
              if (absAngleDiff < 1.22) {
                // Check if city is close to coast (within 20% of distance to boundary)
                const coastProximity = distToCity / distToBoundary;
                if (coastProximity > 0.7) { // City is in outer 30% (close to coast)
                  hasCoastalCity = true;
                }
              }
            });
            
            // If coastal city present, allow border to reach almost to coast
            // Otherwise, use conservative buffer
            let coastalBuffer;
            if (hasCoastalCity) {
              coastalBuffer = 0.995; // 0.5% buffer - almost touching coast for peninsulas
            } else {
              coastalBuffer = 0.97; // 3% buffer for non-coastal areas
            }
            
            radius = Math.min(radius, distToBoundary * coastalBuffer);
          }
        }
        
        // NO radius variation applied here - it was already applied to base radius
        // This ensures city extensions are NOT reduced
        return Math.max(50, radius); // Ensure minimum radius
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
              x: provincePos.x + Math.cos(subAngle) * finalRadius + Math.cos(subAngle + Math.PI/2) * perpOffset,
              y: provincePos.y + Math.sin(subAngle) * finalRadius + Math.sin(subAngle + Math.PI/2) * perpOffset,
            });
          }
        } else {
          // Organic section: single point for smooth curve (use params)
          const angleJitter = (seededRandom(sectionSeed + 200) - 0.5) * shapeParams.provinceAngleJitter;
          const angle = baseAngle + angleJitter;
          const finalRadius = calculateRadius(angle, i * 100, false);
          
          points.push({
            x: provincePos.x + Math.cos(angle) * finalRadius,
            y: provincePos.y + Math.sin(angle) * finalRadius,
          });
        }
      }
      
      provinceShapes.set(province.id, points);
      generatedRegions.push({ node: province, shape: points, children });
    });
    
    setRegions(generatedRegions);
    setNodePositions(repositionedNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, links.length, mapSeed, customPositionsKey, editMode, localPositionsKey]); // Borders update when positions change

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
      // Use custom positions first, then repositioned, then original
      const pos = customPositions?.[node.id] || nodePositions.get(node.id) || { x: node.x, y: node.y };
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
  }, [nodes, nodePositions, customPositions]);

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
    // Right click, middle click, or Space held = pan (even in edit mode)
    if (e.button === 2 || e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (e.button !== 0) return;
    
    // Edit mode actions
    if (editMode) {
      const svgPoint = screenToSVG(e.clientX, e.clientY);
      
      if (internalEditMode === 'decorate') {
        // Place decoration
        const newDeco: TerrainDecoration = {
          id: `deco-${Date.now()}`,
          type: selectedDecorationType,
          x: svgPoint.x,
          y: svgPoint.y,
          size: decorationSize,
          seed: Math.floor(Math.random() * 10000),
        };
        setLocalDecorations(prev => [...prev, newDeco]);
      } else if (internalEditMode === 'delete' && hoveredItem) {
        // Delete hovered item
        if (hoveredItem.type === 'decoration') {
          setLocalDecorations(prev => prev.filter(d => d.id !== hoveredItem.id));
        } else if (hoveredItem.type === 'road') {
          setLocalCustomRoads(prev => prev.filter(r => r.id !== hoveredItem.id));
        }
      } else if (internalEditMode === 'view') {
        // Normal panning in view mode
        setIsPanning(true);
        setStartPoint({ x: e.clientX, y: e.clientY });
      }
    } else {
      // Normal panning when not in edit mode
      setIsPanning(true);
      setStartPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
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
      return;
    }
    
    // Editor: drag location
    if (editMode && draggedLocation && internalEditMode === 'move') {
      const svgPoint = screenToSVG(e.clientX, e.clientY);
      const newPos = {
        x: svgPoint.x - dragOffset.x,
        y: svgPoint.y - dragOffset.y,
      };
      
      // Collision detection and validation
      const draggedNode = nodes.find(n => n.id === draggedLocation);
      const collisionPadding = 100; // Minimum distance between province center and other cities
      
      if (draggedNode?.type === 'province') {
        // PROVINCE: Check collision with other provinces' cities
        const otherCities = nodes.filter(n => 
          (n.locationType === 'city' || n.locationType === 'town') && 
          n.parentLocationId !== draggedLocation
        );
        
        const collisionAdjustments: Record<string, { x: number; y: number }> = {};
        
        otherCities.forEach(city => {
          const cityPos = localLocationPositions[city.id] || { x: city.x, y: city.y };
          const dx = cityPos.x - newPos.x;
          const dy = cityPos.y - newPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // If province center is too close to this city, push city away
          if (dist < collisionPadding) {
            const angle = Math.atan2(dy, dx);
            const pushDist = collisionPadding - dist + 20; // Extra padding
            collisionAdjustments[city.id] = {
              x: cityPos.x + Math.cos(angle) * pushDist,
              y: cityPos.y + Math.sin(angle) * pushDist,
            };
          }
        });
        
        // Apply both the province move and any collision adjustments
        setLocalLocationPositions(prev => ({
          ...prev,
          [draggedLocation]: newPos,
          ...collisionAdjustments,
        }));
      } else if (draggedNode?.locationType === 'city' || draggedNode?.locationType === 'town') {
        // CITY/TOWN: Check if position is within or very close to parent country's land boundaries
        const parentProvince = nodes.find(n => n.id === draggedNode.parentLocationId);
        const parentCountry = parentProvince ? nodes.find(n => n.id === parentProvince.parentLocationId) : null;
        
        // Get the country's boundary shape
        const countryRegion = regions.find(r => r.node.id === parentCountry?.id);
        
        if (countryRegion?.shape) {
          // Check if inside country boundaries
          const isInLand = isPointInPolygon(newPos.x, newPos.y, countryRegion.shape);
          
          // If not directly inside, check if close to coast (for coastal cities)
          let isNearCoast = false;
          if (!isInLand) {
            // Check distance to closest boundary point
            let minDistToBoundary = Infinity;
            const shape = countryRegion.shape;
            
            for (let i = 0; i < shape.length; i++) {
              const p1 = shape[i];
              const p2 = shape[(i + 1) % shape.length];
              
              // Calculate distance from point to line segment
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const lengthSq = dx * dx + dy * dy;
              
              let t = 0;
              if (lengthSq > 0) {
                t = Math.max(0, Math.min(1, ((newPos.x - p1.x) * dx + (newPos.y - p1.y) * dy) / lengthSq));
              }
              
              const closestX = p1.x + t * dx;
              const closestY = p1.y + t * dy;
              const dist = Math.sqrt(Math.pow(newPos.x - closestX, 2) + Math.pow(newPos.y - closestY, 2));
              
              minDistToBoundary = Math.min(minDistToBoundary, dist);
            }
            
            // Allow cities within 50px of coast (coastal tolerance for peninsulas)
            if (minDistToBoundary < 50) {
              isNearCoast = true;
            }
          }
          
          if (isInLand || isNearCoast) {
            // Valid position - inside or very close to country boundaries
            setLocalLocationPositions(prev => ({
              ...prev,
              [draggedLocation]: newPos,
            }));
          }
          // If not in land or near coast, don't update position (prevent far ocean placement)
        } else {
          // No country boundary found, allow move (fallback)
          setLocalLocationPositions(prev => ({
            ...prev,
            [draggedLocation]: newPos,
          }));
        }
      } else {
        // Other types: just update position normally
        setLocalLocationPositions(prev => ({
          ...prev,
          [draggedLocation]: newPos,
        }));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (editMode) {
      setDraggedLocation(null);
    }
  };
  
  // Editor: handle location click/drag
  const handleLocationMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (!editMode) return;
    
    if (internalEditMode === 'move') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const pos = getNodePos(nodeId, node);
      const svgPoint = screenToSVG(e.clientX, e.clientY);
      
      setDraggedLocation(nodeId);
      setDragOffset({ x: svgPoint.x - pos.x, y: svgPoint.y - pos.y });
    } else if (internalEditMode === 'road') {
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
        setLocalCustomRoads(prev => [...prev, newRoad]);
        setRoadStartLocation(null);
      }
    }
  }, [editMode, internalEditMode, nodes, getNodePos, screenToSVG, roadStartLocation, roadStyle]);

  // Keyboard handlers for editor
  useEffect(() => {
    if (!editMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setSpaceHeld(true);
          break;
        case 'Escape':
          if (roadStartLocation) {
            setRoadStartLocation(null);
          } else {
            onExitEditMode?.();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setViewBox(prev => {
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
          break;
        case '-':
        case '_':
          e.preventDefault();
          setViewBox(prev => {
            const newWidth = prev.width * 1.25;
            const newHeight = prev.height * 1.25;
            if (newWidth > MAP_WIDTH * 3) return prev;
            return {
              x: prev.x + (prev.width - newWidth) / 2,
              y: prev.y + (prev.height - newHeight) / 2,
              width: newWidth,
              height: newHeight,
            };
          });
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
  }, [editMode, roadStartLocation, onExitEditMode]);
  
  // Scroll lock when hovering over map
  const [isHoveringMap, setIsHoveringMap] = useState(false);
  
  useEffect(() => {
    if (isHoveringMap) {
      // Prevent page scroll when mouse is over the map
      const preventScroll = (e: Event) => {
        e.preventDefault();
      };
      
      document.body.style.overflow = 'hidden';
      window.addEventListener('wheel', preventScroll, { passive: false });
      
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('wheel', preventScroll);
      };
    }
  }, [isHoveringMap]);
  
  const handleMapMouseEnter = () => {
    setIsHoveringMap(true);
  };
  
  const handleMapMouseLeave = () => {
    setIsPanning(false);
    setIsHoveringMap(false);
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
    <div className="relative h-full flex flex-col">
      {/* Editor toolbar - only show in edit mode */}
      {editMode && (
        <div className="flex flex-col bg-gray-900 border-b border-gray-700 text-white">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Map Editor</span>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-400">Unsaved changes</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEditor}
                disabled={saveStatus === 'saving'}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  hasUnsavedChanges
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : saveStatus === 'saved'
                    ? 'bg-green-600'
                    : saveStatus === 'error'
                    ? 'bg-red-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : '💾 Save'}
              </button>
              <button
                onClick={onExitEditMode}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-t border-gray-700">
            {/* Edit mode selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInternalEditMode('view')}
                className={`px-2 py-1 rounded text-xs ${internalEditMode === 'view' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="View mode (pan/zoom)"
              >
                👁️ View
              </button>
              <button
                onClick={() => setInternalEditMode('move')}
                className={`px-2 py-1 rounded text-xs ${internalEditMode === 'move' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Move locations"
              >
                ✋ Move
              </button>
              <button
                onClick={() => setInternalEditMode('road')}
                className={`px-2 py-1 rounded text-xs ${internalEditMode === 'road' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Draw roads"
              >
                🛤️ Road
              </button>
              <button
                onClick={() => setInternalEditMode('decorate')}
                className={`px-2 py-1 rounded text-xs ${internalEditMode === 'decorate' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Place decorations"
              >
                🌳 Decorate
              </button>
              <button
                onClick={() => setInternalEditMode('delete')}
                className={`px-2 py-1 rounded text-xs ${internalEditMode === 'delete' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title="Delete items"
              >
                🗑️ Delete
              </button>
            </div>
            
            {/* Conditional controls based on edit mode */}
            {internalEditMode === 'decorate' && (
              <>
                <div className="h-4 w-px bg-gray-600" />
                <select
                  value={selectedDecorationType}
                  onChange={(e) => setSelectedDecorationType(e.target.value as TerrainDecoration['type'])}
                  className="px-2 py-1 bg-gray-700 rounded text-xs"
                >
                  <option value="tree">🌲 Tree</option>
                  <option value="treePine">🌲 Pine</option>
                  <option value="treeCluster">🌳 Cluster</option>
                  <option value="rock">🪨 Rock</option>
                  <option value="mountain">⛰️ Mountain</option>
                  <option value="lake">💧 Lake</option>
                  <option value="flowers">🌸 Flowers</option>
                </select>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={decorationSize}
                  onChange={(e) => setDecorationSize(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-gray-400">Size: {decorationSize}</span>
              </>
            )}
            
            {internalEditMode === 'road' && (
              <>
                <div className="h-4 w-px bg-gray-600" />
                <select
                  value={roadStyle}
                  onChange={(e) => setRoadStyle(e.target.value as CustomRoad['style'])}
                  className="px-2 py-1 bg-gray-700 rounded text-xs"
                >
                  <option value="main">Main Road</option>
                  <option value="path">Path</option>
                  <option value="trail">Trail</option>
                </select>
                {roadStartLocation && (
                  <span className="text-xs text-blue-400">Click another location to connect</span>
                )}
              </>
            )}
            
            <div className="h-4 w-px bg-gray-600" />
            
            {/* Terrain toggle */}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={!localDisableProceduralTerrain}
                onChange={(e) => setLocalDisableProceduralTerrain(!e.target.checked)}
                className="rounded"
              />
              <span>Auto Terrain</span>
            </label>
            
            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="Regenerate map"
            >
              🔄 Regen
            </button>
            
            {/* Stats */}
            <div className="ml-auto text-xs text-gray-400">
              Decorations: {localDecorations.length} | Roads: {localCustomRoads.length}
            </div>
          </div>
        </div>
      )}
      
      <div className="relative flex-1">
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
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
        onMouseEnter={handleMapMouseEnter}
        onMouseLeave={handleMapMouseLeave}
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

        {/* Layer 3: Terrain Features */}
        {terrainFeatures.map((feature, index) => {
          const key = `terrain-${feature.type}-${index}`;
          
          if (feature.type === 'tree') {
            const s = feature.size;
            const isPine = feature.variant === 1;
            
            if (isPine) {
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  <rect x={feature.x - 2} y={feature.y - s * 0.05} width={4} height={s * 0.3} fill="#78350F" rx="1" />
                  <polygon points={`${feature.x},${feature.y - s * 0.15} ${feature.x - s * 0.38},${feature.y + s * 0.1} ${feature.x + s * 0.38},${feature.y + s * 0.1}`} fill="#14532D" />
                  <polygon points={`${feature.x},${feature.y - s * 0.4} ${feature.x - s * 0.32},${feature.y - s * 0.05} ${feature.x + s * 0.32},${feature.y - s * 0.05}`} fill="#166534" />
                  <polygon points={`${feature.x},${feature.y - s * 0.65} ${feature.x - s * 0.26},${feature.y - s * 0.3} ${feature.x + s * 0.26},${feature.y - s * 0.3}`} fill="#15803D" />
                </g>
              );
            }
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <rect x={feature.x - 2} y={feature.y - s * 0.1} width={4} height={s * 0.25} fill="#78350F" rx="1" />
                <ellipse cx={feature.x} cy={feature.y - s * 0.45} rx={s * 0.4} ry={s * 0.35} fill="#14532D" />
                <ellipse cx={feature.x} cy={feature.y - s * 0.5} rx={s * 0.35} ry={s * 0.3} fill="#15803D" />
                <ellipse cx={feature.x - s * 0.05} cy={feature.y - s * 0.55} rx={s * 0.25} ry={s * 0.2} fill="#16A34A" />
              </g>
            );
          }
          
          if (feature.type === 'forest') {
            const s = feature.size;
            // Simplified forest - just 2-3 trees instead of complex cluster
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <ellipse cx={feature.x} cy={feature.y - s * 0.3} rx={s * 0.4} ry={s * 0.35} fill="#15803D" />
                <ellipse cx={feature.x - s * 0.25} cy={feature.y - s * 0.15} rx={s * 0.3} ry={s * 0.25} fill="#16A34A" />
                <ellipse cx={feature.x + s * 0.2} cy={feature.y - s * 0.2} rx={s * 0.25} ry={s * 0.2} fill="#14532D" />
              </g>
            );
          }
          
          if (feature.type === 'mountain') {
            const s = feature.size;
            const h = s * 1.3;
            const hasSnow = s > 25;
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <polygon points={`${feature.x},${feature.y - h} ${feature.x - s * 0.55},${feature.y} ${feature.x + s * 0.55},${feature.y}`} fill="#9CA3AF" />
                <polygon points={`${feature.x},${feature.y - h} ${feature.x - s * 0.55},${feature.y} ${feature.x - s * 0.05},${feature.y}`} fill="#6B7280" />
                {hasSnow && (
                  <polygon points={`${feature.x},${feature.y - h} ${feature.x - s * 0.2},${feature.y - h * 0.6} ${feature.x + s * 0.2},${feature.y - h * 0.6}`} fill="#F9FAFB" />
                )}
              </g>
            );
          }
          
          if (feature.type === 'rock') {
            const s = feature.size;
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <ellipse cx={feature.x} cy={feature.y} rx={s * 0.45} ry={s * 0.35} fill="#9CA3AF" />
                <ellipse cx={feature.x - s * 0.12} cy={feature.y - s * 0.1} rx={s * 0.18} ry={s * 0.12} fill="#D1D5DB" opacity="0.6" />
              </g>
            );
          }
          
          if (feature.type === 'lake') {
            // Lakes stay as procedural SVG (organic shapes)
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
            
            const shorePoints: Point[] = lakePoints.map((p) => ({
              x: feature.x + (p.x - feature.x) * 1.18,
              y: feature.y + (p.y - feature.y) * 1.18,
            }));
            
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <path d={pointsToPath(shorePoints, feature.seed, 0)} fill="#D4A574" opacity="0.5" />
                <path d={pointsToPath(lakePoints, feature.seed, 0)} fill="#3B82F6" />
                <ellipse cx={feature.x + s * 0.05} cy={feature.y + s * 0.03} rx={s * 0.3} ry={s * 0.15} fill="#2563EB" opacity="0.4" />
                <ellipse cx={feature.x - s * 0.15} cy={feature.y - s * 0.08} rx={s * 0.18} ry={s * 0.06} fill="#93C5FD" opacity="0.6" />
              </g>
            );
          }
          
          return null;
        })}

        {/* Layer 3.5: Custom Decorations from Editor */}
        {customDecorations && (customDecorations as TerrainDecoration[]).map((deco) => {
          const key = `custom-deco-${deco.id}`;
          const s = deco.size;
          
          if (deco.type === 'tree' || deco.type === 'treePine') {
            const isPine = deco.type === 'treePine';
            if (isPine) {
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  <rect x={deco.x - 2} y={deco.y - s * 0.05} width={4} height={s * 0.3} fill="#78350F" rx="1" />
                  <polygon points={`${deco.x},${deco.y - s * 0.15} ${deco.x - s * 0.38},${deco.y + s * 0.1} ${deco.x + s * 0.38},${deco.y + s * 0.1}`} fill="#14532D" />
                  <polygon points={`${deco.x},${deco.y - s * 0.4} ${deco.x - s * 0.32},${deco.y - s * 0.05} ${deco.x + s * 0.32},${deco.y - s * 0.05}`} fill="#166534" />
                  <polygon points={`${deco.x},${deco.y - s * 0.65} ${deco.x - s * 0.26},${deco.y - s * 0.3} ${deco.x + s * 0.26},${deco.y - s * 0.3}`} fill="#15803D" />
                </g>
              );
            }
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <rect x={deco.x - 2} y={deco.y - s * 0.1} width={4} height={s * 0.25} fill="#78350F" rx="1" />
                <ellipse cx={deco.x} cy={deco.y - s * 0.45} rx={s * 0.4} ry={s * 0.35} fill="#14532D" />
                <ellipse cx={deco.x} cy={deco.y - s * 0.5} rx={s * 0.35} ry={s * 0.3} fill="#15803D" />
                <ellipse cx={deco.x - s * 0.05} cy={deco.y - s * 0.55} rx={s * 0.25} ry={s * 0.2} fill="#16A34A" />
              </g>
            );
          }
          
          if (deco.type === 'treeCluster') {
            const numTrees = 3 + (deco.seed % 3);
            const trees: { tx: number; ty: number; ts: number; isPine: boolean }[] = [];
            for (let i = 0; i < numTrees; i++) {
              const angle = (i / numTrees) * Math.PI * 2 + seededRandom(deco.seed + i) * 0.5;
              const dist = s * 0.3 * (0.3 + seededRandom(deco.seed + i + 10) * 0.7);
              trees.push({
                tx: Math.cos(angle) * dist,
                ty: Math.sin(angle) * dist * 0.5,
                ts: s * (0.4 + seededRandom(deco.seed + i + 20) * 0.4),
                isPine: seededRandom(deco.seed + i + 30) > 0.5,
              });
            }
            trees.sort((a, b) => a.ty - b.ty);
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {trees.map((t, i) => (
                  <g key={i}>
                    <rect x={deco.x + t.tx - 1.5} y={deco.y + t.ty - t.ts * 0.1} width={3} height={t.ts * 0.25} fill="#78350F" rx="0.5" />
                    <ellipse cx={deco.x + t.tx} cy={deco.y + t.ty - t.ts * 0.4} rx={t.ts * 0.28} ry={t.ts * 0.24} fill="#15803D" />
                  </g>
                ))}
              </g>
            );
          }
          
          if (deco.type === 'rock') {
            const numRocks = 1 + (deco.seed % 3);
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {numRocks > 1 && <ellipse cx={deco.x + s * 0.25} cy={deco.y - s * 0.05} rx={s * 0.32} ry={s * 0.25} fill="#6B7280" />}
                {numRocks > 2 && <ellipse cx={deco.x - s * 0.3} cy={deco.y + s * 0.05} rx={s * 0.22} ry={s * 0.18} fill="#9CA3AF" />}
                <ellipse cx={deco.x} cy={deco.y} rx={s * 0.45} ry={s * 0.35} fill="#9CA3AF" />
                <ellipse cx={deco.x - s * 0.12} cy={deco.y - s * 0.1} rx={s * 0.18} ry={s * 0.12} fill="#D1D5DB" opacity="0.6" />
              </g>
            );
          }
          
          if (deco.type === 'mountain') {
            const h = s * 1.3;
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <polygon points={`${deco.x},${deco.y - h} ${deco.x - s * 0.55},${deco.y} ${deco.x + s * 0.55},${deco.y}`} fill="#9CA3AF" />
                <polygon points={`${deco.x},${deco.y - h} ${deco.x - s * 0.55},${deco.y} ${deco.x - s * 0.05},${deco.y}`} fill="#6B7280" />
                {s > 25 && <polygon points={`${deco.x},${deco.y - h} ${deco.x - s * 0.2},${deco.y - h * 0.6} ${deco.x + s * 0.2},${deco.y - h * 0.6}`} fill="#F9FAFB" />}
              </g>
            );
          }
          
          if (deco.type === 'lake') {
            const lakePoints: Point[] = [];
            for (let i = 0; i < 10; i++) {
              const angle = (i / 10) * Math.PI * 2;
              const r = s * 0.5 * (0.75 + seededRandom(deco.seed + i) * 0.5);
              lakePoints.push({ x: deco.x + Math.cos(angle) * r, y: deco.y + Math.sin(angle) * r * 0.5 });
            }
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                <path d={pointsToPath(lakePoints, deco.seed, 0)} fill="#3B82F6" />
                <ellipse cx={deco.x - s * 0.15} cy={deco.y - s * 0.08} rx={s * 0.18} ry={s * 0.06} fill="#93C5FD" opacity="0.6" />
              </g>
            );
          }
          
          if (deco.type === 'flowers') {
            const count = 3 + (deco.seed % 4);
            const colors = ['#E91E63', '#FF5722', '#FFEB3B', '#9C27B0', '#03A9F4'];
            return (
              <g key={key} style={{ pointerEvents: 'none' }}>
                {Array.from({ length: count }).map((_, i) => {
                  const fx = deco.x + (seededRandom(deco.seed + i * 10) - 0.5) * s;
                  const fy = deco.y + (seededRandom(deco.seed + i * 20) - 0.5) * s * 0.5;
                  const color = colors[(deco.seed + i) % colors.length];
                  return (
                    <g key={i} transform={`translate(${fx}, ${fy})`}>
                      <line x1={0} y1={4} x2={0} y2={-2} stroke="#388E3C" strokeWidth={1} />
                      {[0, 1, 2, 3, 4].map(p => (
                        <circle key={p} cx={Math.cos((p / 5) * Math.PI * 2) * 3} cy={-4 + Math.sin((p / 5) * Math.PI * 2) * 3} r={2} fill={color} />
                      ))}
                      <circle cx={0} cy={-4} r={2} fill="#FFC107" />
                    </g>
                  );
                })}
              </g>
            );
          }
          
          return null;
        })}
        
        {/* Layer 3.5: Custom Decorations (from editor) */}
        {editMode && localDecorations.map(deco => (
          <g
            key={deco.id}
            onMouseEnter={() => setHoveredItem({ type: 'decoration', id: deco.id })}
            onMouseLeave={() => setHoveredItem(null)}
            style={{ cursor: internalEditMode === 'delete' ? 'pointer' : 'default' }}
            opacity={hoveredItem?.type === 'decoration' && hoveredItem.id === deco.id && internalEditMode === 'delete' ? 0.5 : 1}
          >
            {renderDecoration(deco)}
          </g>
        ))}
        
        {!editMode && (customDecorations as TerrainDecoration[] || []).map(deco => renderDecoration(deco))}

        {/* Layer 4: Roads */}
        {links.map((link, index) => {
          // Use custom positions first, then repositioned, then original
          const fromPos = getNodePos(link.from.id, link.from);
          const toPos = getNodePos(link.to.id, link.to);
          
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

        {/* Layer 4.5: Custom Roads from Editor */}
        {editMode && localCustomRoads.map((road) => {
          if (!road.fromLocationId || !road.toLocationId) return null;
          const fromNode = nodes.find(n => n.id === road.fromLocationId);
          const toNode = nodes.find(n => n.id === road.toLocationId);
          if (!fromNode || !toNode) return null;
          
          const fromPos = getNodePos(fromNode.id, fromNode);
          const toPos = getNodePos(toNode.id, toNode);
          const roadPath = generateRoadPath(fromPos, toPos, hashString(road.id), 0.25, 3);
          
          const isHovered = hoveredItem?.type === 'road' && hoveredItem.id === road.id;
          const opacity = internalEditMode === 'delete' && isHovered ? 0.5 : 1;
          
          // Match the original road styling with shadow, main, and center line
          if (road.style === 'main') {
            return (
              <g
                key={`custom-road-${road.id}`}
                onMouseEnter={() => setHoveredItem({ type: 'road', id: road.id })}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ cursor: internalEditMode === 'delete' ? 'pointer' : 'default' }}
                opacity={opacity}
              >
                <path d={roadPath} stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d={roadPath} stroke="#8B7355" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d={roadPath} stroke="#FEF3C7" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="10,10" opacity="0.6" />
              </g>
            );
          } else if (road.style === 'path') {
            return (
              <g
                key={`custom-road-${road.id}`}
                onMouseEnter={() => setHoveredItem({ type: 'road', id: road.id })}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ cursor: internalEditMode === 'delete' ? 'pointer' : 'default' }}
                opacity={opacity}
              >
                <path d={roadPath} stroke="rgba(0,0,0,0.15)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d={roadPath} stroke="#A09080" strokeWidth="4" fill="none" strokeLinecap="round" />
              </g>
            );
          } else {
            return (
              <g
                key={`custom-road-${road.id}`}
                onMouseEnter={() => setHoveredItem({ type: 'road', id: road.id })}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ cursor: internalEditMode === 'delete' ? 'pointer' : 'default' }}
                opacity={opacity}
              >
                <path d={roadPath} stroke="#B08060" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="8,6" />
              </g>
            );
          }
        })}
        
        {!editMode && customRoads && (customRoads as CustomRoad[]).map((road) => {
          if (!road.fromLocationId || !road.toLocationId) return null;
          const fromNode = nodes.find(n => n.id === road.fromLocationId);
          const toNode = nodes.find(n => n.id === road.toLocationId);
          if (!fromNode || !toNode) return null;
          
          const fromPos = getNodePos(fromNode.id, fromNode);
          const toPos = getNodePos(toNode.id, toNode);
          const roadPath = generateRoadPath(fromPos, toPos, hashString(road.id), 0.25, 3);
          
          // Match the original road styling with shadow, main, and center line
          if (road.style === 'main') {
            return (
              <g key={`custom-road-${road.id}`} style={{ pointerEvents: "none" }}>
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
          } else if (road.style === 'path') {
            return (
              <g key={`custom-road-${road.id}`} style={{ pointerEvents: "none" }}>
                {/* Path shadow */}
                <path
                  d={roadPath}
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Main path */}
                <path
                  d={roadPath}
                  stroke="#A09080"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            );
          } else {
            // Trail style
            return (
              <g key={`custom-road-${road.id}`} style={{ pointerEvents: "none" }}>
                {/* Trail */}
                <path
                  d={roadPath}
                  stroke="#90A080"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="8,4"
                />
              </g>
            );
          }
        })}

        {/* Layer 5: ALL ICONS (below all labels) */}
        {(() => {
          const zoomScale = viewBox.width / MAP_WIDTH;
          
          return nodes.map((node) => {
            const residentNames = node.residents.map((r) => r.name).join(", ");
            const icon = node.iconData || "📍";
            
            // Use custom positions first, then repositioned, then original
            const pos = getNodePos(node.id, node);
            const nodeX = pos.x;
            const nodeY = pos.y;
            
            // Base sizes
            const baseIconSize = node.locationType === "country" || node.locationType === "province" ? 32 : 24;
            const baseIconOffset = 8;
            const iconSize = baseIconSize * zoomScale;
            const iconOffset = baseIconOffset * zoomScale;
            
            const isHovered = hoveredItem?.type === 'location' && hoveredItem.id === node.id;
            const isDragging = draggedLocation === node.id;
            const isRoadStart = roadStartLocation === node.id;
            const showSelection = editMode && (internalEditMode === 'move' || internalEditMode === 'road') && (isHovered || isDragging || isRoadStart);
            
            return (
              <g key={`icon-${node.id}`}>
                {/* Selection ring in edit mode */}
                {showSelection && (
                  <circle
                    cx={nodeX}
                    cy={nodeY}
                    r={20}
                    fill="none"
                    stroke={isRoadStart ? "#3B82F6" : "#F59E0B"}
                    strokeWidth={3}
                    strokeDasharray="5,3"
                    opacity={0.8}
                  />
                )}
                
                {editMode ? (
                  <g
                    onMouseEnter={() => setHoveredItem({ type: 'location', id: node.id })}
                    onMouseLeave={() => setHoveredItem(null)}
                    onMouseDown={(e) => handleLocationMouseDown(e, node.id)}
                    style={{ cursor: internalEditMode === 'move' ? 'grab' : internalEditMode === 'road' ? 'crosshair' : 'pointer' }}
                  >
                    <title>
                      {residentNames
                        ? `${node.name} — ${residentNames}`
                        : `${node.name} — no residents yet`}
                    </title>
                    
                    {/* Invisible hit area */}
                    <circle cx={nodeX} cy={nodeY} r={16} fill="transparent" />
                    
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
                  </g>
                ) : (
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
                )}
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
            
            // Use custom positions first, then repositioned, then original
            const pos = getNodePos(node.id, node);
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
    </div>
  );
}
