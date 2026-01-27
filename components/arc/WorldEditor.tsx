"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

export type TerrainType = 
  | 'water' | 'waterDeep' | 'waterShallow'
  | 'grass' | 'grassTall' | 'grassDry'
  | 'dirt' | 'sand' | 'mud'
  | 'stone' | 'rock' | 'gravel'
  | 'snow' | 'ice'
  | 'lava';

export type ObjectType = 
  | 'tree' | 'treePine' | 'treeOak' | 'treeDead'
  | 'rock1' | 'rock2' | 'rock3'
  | 'bush' | 'flower' | 'mushroom'
  | 'mountain' | 'hill'
  | 'house' | 'castle' | 'tower' | 'ruins';

export type LocationType = 'country' | 'province' | 'city' | 'town' | 'village' | 'landmark';

export type Tool = 'brush' | 'eraser' | 'fill' | 'select' | 'placeObject' | 'placeLocation' | 'pan';

export type EditorMode = 'auto' | 'manual';

export type Layer = 'terrain' | 'objects' | 'locations';

type MapObject = {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  customSprite?: string;
};

type MapLocation = {
  id: string;
  name: string;
  type: LocationType;
  x: number;
  y: number;
  icon: string;
  linkedLocationId?: string; // Link to archive location
};

type MapData = {
  width: number;
  height: number;
  terrain: (TerrainType | null)[][];
  objects: MapObject[];
  locations: MapLocation[];
};

// Linked location from the archive
type ArchiveLocation = {
  id: string;
  name: string;
  locationType: string | null;
  x: number;
  y: number;
  iconData: string | null;
};

interface WorldEditorProps {
  initialMapData?: MapData;
  archiveLocations?: ArchiveLocation[];
  onSave?: (mapData: MapData) => void;
  onClose?: () => void;
}

// =============================================================================
// TERRAIN TILE DEFINITIONS - Each has an SVG render function
// =============================================================================

const TERRAIN_DEFS: Record<TerrainType, { name: string; category: string }> = {
  water: { name: 'Water', category: 'Water' },
  waterDeep: { name: 'Deep Water', category: 'Water' },
  waterShallow: { name: 'Shallow', category: 'Water' },
  grass: { name: 'Grass', category: 'Land' },
  grassTall: { name: 'Tall Grass', category: 'Land' },
  grassDry: { name: 'Dry Grass', category: 'Land' },
  dirt: { name: 'Dirt', category: 'Land' },
  sand: { name: 'Sand', category: 'Land' },
  mud: { name: 'Mud', category: 'Land' },
  stone: { name: 'Stone', category: 'Rock' },
  rock: { name: 'Rocky', category: 'Rock' },
  gravel: { name: 'Gravel', category: 'Rock' },
  snow: { name: 'Snow', category: 'Cold' },
  ice: { name: 'Ice', category: 'Cold' },
  lava: { name: 'Lava', category: 'Special' },
};

const OBJECT_DEFS: Record<ObjectType, { name: string; category: string; size: number }> = {
  tree: { name: 'Tree', category: 'Nature', size: 1 },
  treePine: { name: 'Pine Tree', category: 'Nature', size: 1 },
  treeOak: { name: 'Oak Tree', category: 'Nature', size: 2 },
  treeDead: { name: 'Dead Tree', category: 'Nature', size: 1 },
  rock1: { name: 'Small Rock', category: 'Nature', size: 1 },
  rock2: { name: 'Medium Rock', category: 'Nature', size: 1 },
  rock3: { name: 'Large Rock', category: 'Nature', size: 2 },
  bush: { name: 'Bush', category: 'Nature', size: 1 },
  flower: { name: 'Flowers', category: 'Nature', size: 1 },
  mushroom: { name: 'Mushrooms', category: 'Nature', size: 1 },
  mountain: { name: 'Mountain', category: 'Terrain', size: 3 },
  hill: { name: 'Hill', category: 'Terrain', size: 2 },
  house: { name: 'House', category: 'Building', size: 2 },
  castle: { name: 'Castle', category: 'Building', size: 4 },
  tower: { name: 'Tower', category: 'Building', size: 1 },
  ruins: { name: 'Ruins', category: 'Building', size: 2 },
};

// =============================================================================
// SVG TILE RENDERERS - Pixel-art style sprites
// =============================================================================

function renderTerrainTile(ctx: CanvasRenderingContext2D, type: TerrainType, x: number, y: number, size: number) {
  const colors: Record<TerrainType, { base: string; detail: string; accent?: string }> = {
    water: { base: '#4A90D9', detail: '#6BA3E0', accent: '#3B7BC4' },
    waterDeep: { base: '#2E5A8C', detail: '#3B6FA3', accent: '#1E4A7C' },
    waterShallow: { base: '#7AB8E8', detail: '#9ACBEF', accent: '#5AA0D8' },
    grass: { base: '#5B8C3E', detail: '#6FA34A', accent: '#4A7832' },
    grassTall: { base: '#4A7832', detail: '#5B8C3E', accent: '#3A6828' },
    grassDry: { base: '#9B8B5A', detail: '#AB9B6A', accent: '#8B7B4A' },
    dirt: { base: '#8B6B4A', detail: '#9B7B5A', accent: '#7B5B3A' },
    sand: { base: '#D4C4A0', detail: '#E4D4B0', accent: '#C4B490' },
    mud: { base: '#5A4A3A', detail: '#6A5A4A', accent: '#4A3A2A' },
    stone: { base: '#7A7A7A', detail: '#8A8A8A', accent: '#6A6A6A' },
    rock: { base: '#6A6A6A', detail: '#7A7A7A', accent: '#5A5A5A' },
    gravel: { base: '#8A8A7A', detail: '#9A9A8A', accent: '#7A7A6A' },
    snow: { base: '#E8E8F0', detail: '#F8F8FF', accent: '#D8D8E0' },
    ice: { base: '#A8D8F0', detail: '#B8E8FF', accent: '#98C8E0' },
    lava: { base: '#D84000', detail: '#F86020', accent: '#B83000' },
  };

  const c = colors[type];
  
  // Base fill
  ctx.fillStyle = c.base;
  ctx.fillRect(x, y, size, size);
  
  // Add texture details based on terrain type
  const seed = (x * 31 + y * 17) % 100;
  
  if (type.startsWith('water')) {
    // Wave lines
    ctx.strokeStyle = c.detail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const waveY = y + size * 0.3 + (seed % 3) * 2;
    ctx.moveTo(x, waveY);
    ctx.quadraticCurveTo(x + size * 0.5, waveY - 3, x + size, waveY);
    ctx.stroke();
    
    const waveY2 = y + size * 0.7 + (seed % 2) * 2;
    ctx.beginPath();
    ctx.moveTo(x, waveY2);
    ctx.quadraticCurveTo(x + size * 0.5, waveY2 + 3, x + size, waveY2);
    ctx.stroke();
  } else if (type.startsWith('grass')) {
    // Grass blades
    ctx.strokeStyle = c.detail;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const bx = x + (seed + i * 23) % (size - 4) + 2;
      const by = y + (seed + i * 17) % (size - 6) + 6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - 4 - (i % 2) * 2);
      ctx.stroke();
    }
    // Small dots
    ctx.fillStyle = c.accent || c.detail;
    for (let i = 0; i < 2; i++) {
      const dx = x + (seed + i * 37) % (size - 2) + 1;
      const dy = y + (seed + i * 41) % (size - 2) + 1;
      ctx.fillRect(dx, dy, 1, 1);
    }
  } else if (type === 'dirt' || type === 'mud') {
    // Scattered pebbles
    ctx.fillStyle = c.detail;
    for (let i = 0; i < 3; i++) {
      const px = x + (seed + i * 29) % (size - 3) + 1;
      const py = y + (seed + i * 43) % (size - 3) + 1;
      ctx.fillRect(px, py, 2, 1);
    }
  } else if (type === 'sand') {
    // Sand dots
    ctx.fillStyle = c.accent || c.detail;
    for (let i = 0; i < 4; i++) {
      const px = x + (seed + i * 19) % (size - 1);
      const py = y + (seed + i * 31) % (size - 1);
      ctx.fillRect(px, py, 1, 1);
    }
  } else if (type === 'stone' || type === 'rock' || type === 'gravel') {
    // Stone cracks/lines
    ctx.strokeStyle = c.accent || c.detail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + seed % size, y);
    ctx.lineTo(x + (seed + 10) % size, y + size);
    ctx.stroke();
  } else if (type === 'snow') {
    // Sparkle dots
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 2; i++) {
      const px = x + (seed + i * 23) % (size - 1);
      const py = y + (seed + i * 37) % (size - 1);
      ctx.fillRect(px, py, 1, 1);
    }
  } else if (type === 'lava') {
    // Glow effect
    ctx.fillStyle = c.detail;
    const gx = x + (seed % (size - 4)) + 2;
    const gy = y + ((seed * 3) % (size - 4)) + 2;
    ctx.beginPath();
    ctx.arc(gx, gy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderObject(ctx: CanvasRenderingContext2D, type: ObjectType, x: number, y: number, tileSize: number) {
  const size = OBJECT_DEFS[type].size * tileSize;
  const cx = x + size / 2;
  const cy = y + size / 2;
  
  ctx.save();
  
  if (type === 'tree' || type === 'treePine') {
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cx - 2, cy, 4, size * 0.4);
    // Foliage (triangle for pine)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.moveTo(cx, y + 2);
    ctx.lineTo(cx - size * 0.35, cy);
    ctx.lineTo(cx + size * 0.35, cy);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.moveTo(cx, y + 4);
    ctx.lineTo(cx - size * 0.2, cy - 4);
    ctx.lineTo(cx + size * 0.1, cy - 6);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'treeOak') {
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cx - 3, cy + size * 0.1, 6, size * 0.35);
    // Round foliage
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - size * 0.15, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'treeDead') {
    // Dead trunk with branches
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y + size);
    ctx.lineTo(cx, y + size * 0.3);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.5);
    ctx.lineTo(cx - 8, y + size * 0.3);
    ctx.moveTo(cx, y + size * 0.4);
    ctx.lineTo(cx + 6, y + size * 0.2);
    ctx.stroke();
  } else if (type.startsWith('rock')) {
    // Rock shape
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.35, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.15, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.35, cy + size * 0.1);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.35);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.1, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.15, cy);
    ctx.lineTo(cx - size * 0.1, cy + size * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'bush') {
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'flower') {
    // Stem
    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 6);
    ctx.lineTo(cx, cy - 2);
    ctx.stroke();
    // Petals
    ctx.fillStyle = '#E91E63';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 4;
      const py = cy - 4 + Math.sin(angle) * 4;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'mountain') {
    // Mountain shape
    ctx.fillStyle = '#616161';
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(cx, y + 4);
    ctx.lineTo(x + size, y + size);
    ctx.closePath();
    ctx.fill();
    // Snow cap
    ctx.fillStyle = '#FAFAFA';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, y + size * 0.35);
    ctx.lineTo(cx, y + 4);
    ctx.lineTo(cx + size * 0.15, y + size * 0.35);
    ctx.closePath();
    ctx.fill();
    // Shading
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.moveTo(cx, y + 4);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(cx + size * 0.3, y + size);
    ctx.lineTo(cx, y + size * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'hill') {
    ctx.fillStyle = '#6B8E23';
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.2, size * 0.45, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7BA428';
    ctx.beginPath();
    ctx.arc(cx - size * 0.15, cy + size * 0.15, size * 0.3, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'house') {
    // House body
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(x + 4, cy, size - 8, size * 0.45);
    // Roof
    ctx.fillStyle = '#6D4C41';
    ctx.beginPath();
    ctx.moveTo(x + 2, cy);
    ctx.lineTo(cx, y + 4);
    ctx.lineTo(x + size - 2, cy);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(cx - 3, cy + size * 0.15, 6, size * 0.3);
    // Window
    ctx.fillStyle = '#FFF9C4';
    ctx.fillRect(x + 8, cy + 4, 4, 4);
  } else if (type === 'castle') {
    // Main body
    ctx.fillStyle = '#78909C';
    ctx.fillRect(x + size * 0.1, cy - size * 0.1, size * 0.8, size * 0.55);
    // Towers
    ctx.fillRect(x, y + size * 0.2, size * 0.2, size * 0.6);
    ctx.fillRect(x + size * 0.8, y + size * 0.2, size * 0.2, size * 0.6);
    // Tower tops
    ctx.fillStyle = '#546E7A';
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.2);
    ctx.lineTo(x + size * 0.1, y + size * 0.05);
    ctx.lineTo(x + size * 0.2, y + size * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.8, y + size * 0.2);
    ctx.lineTo(x + size * 0.9, y + size * 0.05);
    ctx.lineTo(x + size, y + size * 0.2);
    ctx.fill();
    // Gate
    ctx.fillStyle = '#37474F';
    ctx.fillRect(cx - size * 0.1, cy + size * 0.1, size * 0.2, size * 0.35);
  } else if (type === 'tower') {
    ctx.fillStyle = '#78909C';
    ctx.fillRect(cx - size * 0.2, y + size * 0.3, size * 0.4, size * 0.7);
    ctx.fillStyle = '#546E7A';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.25, y + size * 0.3);
    ctx.lineTo(cx, y + 2);
    ctx.lineTo(cx + size * 0.25, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'ruins') {
    ctx.fillStyle = '#9E9E9E';
    // Broken walls
    ctx.fillRect(x + 2, cy, 4, size * 0.4);
    ctx.fillRect(x + size - 8, cy - 4, 6, size * 0.5);
    ctx.fillRect(cx - 2, cy + 4, 8, size * 0.3);
    // Rubble
    ctx.fillStyle = '#757575';
    ctx.fillRect(x + 8, cy + size * 0.3, 3, 2);
    ctx.fillRect(cx + 2, cy + size * 0.35, 4, 2);
  }
  
  ctx.restore();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 48;
const TILE_SIZE = 16;

export function WorldEditor({
  initialMapData,
  archiveLocations = [],
  onSave,
  onClose,
}: WorldEditorProps) {
  // Map data state
  const [mapData, setMapData] = useState<MapData>(() => {
    if (initialMapData) return initialMapData;
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      terrain: Array(DEFAULT_HEIGHT).fill(null).map(() => Array(DEFAULT_WIDTH).fill(null)),
      objects: [],
      locations: [],
    };
  });

  // Editor state
  const [mode, setMode] = useState<EditorMode>('manual');
  const [tool, setTool] = useState<Tool>('brush');
  const [activeLayer, setActiveLayer] = useState<Layer>('terrain');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('grass');
  const [selectedObject, setSelectedObject] = useState<ObjectType>('tree');
  const [selectedLocationType, setSelectedLocationType] = useState<LocationType>('city');
  const [brushSize, setBrushSize] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // View state
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate canvas size
  const canvasWidth = mapData.width * TILE_SIZE;
  const canvasHeight = mapData.height * TILE_SIZE;

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply view transform
    ctx.save();
    ctx.translate(-viewOffset.x, -viewOffset.y);
    ctx.scale(zoom, zoom);

    // Draw terrain
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const terrain = mapData.terrain[y]?.[x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        
        if (terrain) {
          renderTerrainTile(ctx, terrain, px, py, TILE_SIZE);
        } else {
          // Empty = water by default
          renderTerrainTile(ctx, 'water', px, py, TILE_SIZE);
        }
      }
    }

    // Draw grid
    if (showGrid && zoom >= 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 0.5 / zoom;
      
      for (let x = 0; x <= mapData.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= mapData.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(canvasWidth, y * TILE_SIZE);
        ctx.stroke();
      }
    }

    // Draw objects
    mapData.objects.forEach(obj => {
      const px = obj.x * TILE_SIZE;
      const py = obj.y * TILE_SIZE;
      renderObject(ctx, obj.type, px, py, TILE_SIZE);
    });

    // Draw locations
    mapData.locations.forEach(loc => {
      const iconSize = loc.type === 'country' || loc.type === 'province' ? 24 : 18;
      
      // Background circle
      ctx.fillStyle = loc.type === 'city' ? '#FFA726' : loc.type === 'town' ? '#EC407A' : '#42A5F5';
      ctx.beginPath();
      ctx.arc(loc.x, loc.y, iconSize / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Icon text
      ctx.font = `${iconSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(loc.icon || '📍', loc.x, loc.y);
      
      // Label
      ctx.font = `bold ${10 / zoom}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeText(loc.name, loc.x, loc.y + iconSize / 2 + 10);
      ctx.fillText(loc.name, loc.x, loc.y + iconSize / 2 + 10);
    });

    ctx.restore();
  }, [mapData, viewOffset, zoom, showGrid, canvasWidth, canvasHeight]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case '1':
          setActiveLayer('terrain');
          setTool('brush');
          break;
        case '2':
          setActiveLayer('objects');
          setTool('placeObject');
          break;
        case '3':
          setActiveLayer('locations');
          setTool('placeLocation');
          break;
        case 'b':
          setTool('brush');
          break;
        case 'e':
          setTool('eraser');
          break;
        case 'g':
          setShowGrid(g => !g);
          break;
        case ' ':
          e.preventDefault();
          setTool('pan');
          break;
        case 'Escape':
          if (onClose) onClose();
          break;
        case '[':
          setBrushSize(s => Math.max(1, s - 1));
          break;
        case ']':
          setBrushSize(s => Math.min(8, s + 1));
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        // Return to previous tool after releasing space
        if (activeLayer === 'terrain') setTool('brush');
        else if (activeLayer === 'objects') setTool('placeObject');
        else setTool('placeLocation');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeLayer, onClose]);

  // ==========================================================================
  // INPUT HANDLING
  // ==========================================================================

  const screenToWorld = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left + viewOffset.x) / zoom;
    const y = (screenY - rect.top + viewOffset.y) / zoom;
    return { x, y };
  };

  const screenToTile = (screenX: number, screenY: number) => {
    const world = screenToWorld(screenX, screenY);
    return {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };
  };

  const paintTerrain = (tileX: number, tileY: number) => {
    if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) return;
    
    setMapData(prev => {
      const newTerrain = prev.terrain.map(row => [...row]);
      const radius = Math.floor(brushSize / 2);
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = tileX + dx;
          const y = tileY + dy;
          if (x >= 0 && x < prev.width && y >= 0 && y < prev.height) {
            if (dx * dx + dy * dy <= radius * radius + radius) {
              newTerrain[y][x] = tool === 'eraser' ? null : selectedTerrain;
            }
          }
        }
      }
      
      return { ...prev, terrain: newTerrain };
    });
  };

  const placeObject = (tileX: number, tileY: number) => {
    if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) return;
    
    const newObject: MapObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedObject,
      x: tileX,
      y: tileY,
    };
    
    setMapData(prev => ({
      ...prev,
      objects: [...prev.objects, newObject],
    }));
  };

  const placeLocation = (worldX: number, worldY: number) => {
    const name = prompt('Enter location name:');
    if (!name) return;
    
    const icon = selectedLocationType === 'city' ? '🏙️' 
      : selectedLocationType === 'town' ? '🏘️'
      : selectedLocationType === 'village' ? '🏠'
      : selectedLocationType === 'country' ? '🌍'
      : selectedLocationType === 'province' ? '🏛️'
      : '📍';
    
    const newLocation: MapLocation = {
      id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type: selectedLocationType,
      x: worldX,
      y: worldY,
      icon,
    };
    
    setMapData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation],
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    
    // Right click or space = pan
    if (e.button === 2 || tool === 'pan') {
      setIsPanning(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }
    
    if (e.button !== 0) return;
    
    if (activeLayer === 'terrain' && (tool === 'brush' || tool === 'eraser')) {
      setIsPainting(true);
      const tile = screenToTile(clientX, clientY);
      paintTerrain(tile.x, tile.y);
    } else if (activeLayer === 'objects' && tool === 'placeObject') {
      const tile = screenToTile(clientX, clientY);
      placeObject(tile.x, tile.y);
    } else if (activeLayer === 'locations' && tool === 'placeLocation') {
      const world = screenToWorld(clientX, clientY);
      placeLocation(world.x, world.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    
    if (isPanning) {
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      setViewOffset(prev => ({
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }
    
    if (isPainting && activeLayer === 'terrain') {
      const tile = screenToTile(clientX, clientY);
      paintTerrain(tile.x, tile.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsPainting(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.25, Math.min(4, z * delta)));
    } else {
      // Pan
      setViewOffset(prev => ({
        x: prev.x + e.deltaX,
        y: prev.y + e.deltaY,
      }));
    }
  };

  // ==========================================================================
  // AUTO GENERATE
  // ==========================================================================

  const autoGenerate = () => {
    if (archiveLocations.length === 0) {
      alert('No locations in archive to generate from.');
      return;
    }
    
    // Fill with water first
    const newTerrain: (TerrainType | null)[][] = 
      Array(mapData.height).fill(null).map(() => Array(mapData.width).fill('water'));
    
    // Generate land masses around locations
    archiveLocations.forEach(loc => {
      const tileX = Math.floor((loc.x / 1200) * mapData.width);
      const tileY = Math.floor((loc.y / 800) * mapData.height);
      const radius = loc.locationType === 'country' ? 15 : loc.locationType === 'province' ? 10 : 5;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = tileX + dx;
          const y = tileY + dy;
          if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              // Inner = grass, outer = sand (beach)
              if (dist > radius - 2) {
                newTerrain[y][x] = 'sand';
              } else {
                newTerrain[y][x] = 'grass';
              }
            }
          }
        }
      }
    });
    
    // Create locations from archive
    const newLocations: MapLocation[] = archiveLocations.map(loc => ({
      id: `loc-${loc.id}`,
      name: loc.name,
      type: (loc.locationType || 'landmark') as LocationType,
      x: (loc.x / 1200) * canvasWidth,
      y: (loc.y / 800) * canvasHeight,
      icon: loc.iconData || (loc.locationType === 'city' ? '🏙️' : loc.locationType === 'country' ? '🌍' : '📍'),
      linkedLocationId: loc.id,
    }));
    
    // Add some random trees
    const newObjects: MapObject[] = [];
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * mapData.width);
      const y = Math.floor(Math.random() * mapData.height);
      if (newTerrain[y][x] === 'grass') {
        newObjects.push({
          id: `obj-${i}`,
          type: Math.random() > 0.5 ? 'tree' : 'treePine',
          x,
          y,
        });
      }
    }
    
    setMapData(prev => ({
      ...prev,
      terrain: newTerrain,
      objects: newObjects,
      locations: newLocations,
    }));
  };

  // ==========================================================================
  // RENDER UI
  // ==========================================================================

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Top Toolbar */}
      <div className="flex items-center gap-3 p-2 bg-gray-800 border-b border-gray-700">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-700 rounded p-1">
          <button
            onClick={() => setMode('auto')}
            className={`px-3 py-1 rounded text-sm ${mode === 'auto' ? 'bg-indigo-600' : 'hover:bg-gray-600'}`}
          >
            🎲 Auto Generate
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1 rounded text-sm ${mode === 'manual' ? 'bg-indigo-600' : 'hover:bg-gray-600'}`}
          >
            ✏️ Manual Edit
          </button>
        </div>

        {mode === 'auto' && (
          <button
            onClick={autoGenerate}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium"
          >
            Generate Map from Locations
          </button>
        )}

        <div className="h-6 w-px bg-gray-600" />

        {/* Layer Selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Layer:</span>
          {(['terrain', 'objects', 'locations'] as Layer[]).map(layer => (
            <button
              key={layer}
              onClick={() => {
                setActiveLayer(layer);
                if (layer === 'terrain') setTool('brush');
                else if (layer === 'objects') setTool('placeObject');
                else setTool('placeLocation');
              }}
              className={`px-2 py-1 rounded text-sm capitalize ${activeLayer === layer ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {layer === 'terrain' ? '🗺️' : layer === 'objects' ? '🌳' : '📍'} {layer}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-600" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Tool:</span>
          {activeLayer === 'terrain' && (
            <>
              <button onClick={() => setTool('brush')} className={`p-1.5 rounded ${tool === 'brush' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title="Brush">🖌️</button>
              <button onClick={() => setTool('eraser')} className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title="Eraser">🧹</button>
              <button onClick={() => setTool('fill')} className={`p-1.5 rounded ${tool === 'fill' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title="Fill">🪣</button>
            </>
          )}
          <button onClick={() => setTool('pan')} className={`p-1.5 rounded ${tool === 'pan' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`} title="Pan">✋</button>
        </div>

        {/* Brush Size (for terrain) */}
        {activeLayer === 'terrain' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Size:</span>
            {[1, 2, 3, 5, 8].map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`w-7 h-7 rounded text-xs ${brushSize === size ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* View Controls */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded ${showGrid ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          title="Toggle Grid"
        >
          #
        </button>
        <button onClick={() => setZoom(z => Math.min(4, z * 1.25))} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded">+</button>
        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.25, z * 0.8))} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded">−</button>
        <button 
          onClick={() => { setZoom(1); setViewOffset({ x: 0, y: 0 }); }} 
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          Reset
        </button>

        <div className="h-6 w-px bg-gray-600" />

        {onSave && (
          <button
            onClick={() => onSave(mapData)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium"
          >
            💾 Save
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Palette */}
        <div className="w-56 bg-gray-800 border-r border-gray-700 p-2 overflow-y-auto">
          {activeLayer === 'terrain' && (
            <>
              <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Terrain Tiles</h3>
              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(TERRAIN_DEFS) as TerrainType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => { setSelectedTerrain(type); setTool('brush'); }}
                    className={`relative aspect-square rounded overflow-hidden border-2 ${selectedTerrain === type ? 'border-indigo-500' : 'border-transparent hover:border-gray-500'}`}
                    title={TERRAIN_DEFS[type].name}
                  >
                    <canvas
                      ref={el => {
                        if (el) {
                          const ctx = el.getContext('2d');
                          if (ctx) {
                            el.width = 32;
                            el.height = 32;
                            renderTerrainTile(ctx, type, 0, 0, 32);
                          }
                        }
                      }}
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          {activeLayer === 'objects' && (
            <>
              <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Objects</h3>
              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(OBJECT_DEFS) as ObjectType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => { setSelectedObject(type); setTool('placeObject'); }}
                    className={`relative aspect-square rounded overflow-hidden border-2 bg-gray-700 ${selectedObject === type ? 'border-indigo-500' : 'border-transparent hover:border-gray-500'}`}
                    title={OBJECT_DEFS[type].name}
                  >
                    <canvas
                      ref={el => {
                        if (el) {
                          const ctx = el.getContext('2d');
                          if (ctx) {
                            const size = OBJECT_DEFS[type].size * 16;
                            el.width = 48;
                            el.height = 48;
                            ctx.fillStyle = '#374151';
                            ctx.fillRect(0, 0, 48, 48);
                            renderObject(ctx, type, (48 - size) / 2, (48 - size) / 2, 16);
                          }
                        }
                      }}
                      className="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          {activeLayer === 'locations' && (
            <>
              <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Location Types</h3>
              <div className="space-y-1">
                {(['country', 'province', 'city', 'town', 'village', 'landmark'] as LocationType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => { setSelectedLocationType(type); setTool('placeLocation'); }}
                    className={`w-full px-3 py-2 rounded text-left text-sm capitalize ${selectedLocationType === type ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {type === 'country' ? '🌍' : type === 'province' ? '🏛️' : type === 'city' ? '🏙️' : type === 'town' ? '🏘️' : type === 'village' ? '🏠' : '📍'} {type}
                  </button>
                ))}
              </div>

              {archiveLocations.length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-gray-400 uppercase mt-4 mb-2">From Archive</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {archiveLocations.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          const world = { x: canvasWidth / 2, y: canvasHeight / 2 };
                          const newLocation: MapLocation = {
                            id: `loc-${loc.id}`,
                            name: loc.name,
                            type: (loc.locationType || 'landmark') as LocationType,
                            x: world.x,
                            y: world.y,
                            icon: loc.iconData || '📍',
                            linkedLocationId: loc.id,
                          };
                          setMapData(prev => ({
                            ...prev,
                            locations: [...prev.locations, newLocation],
                          }));
                        }}
                        className="w-full px-2 py-1 rounded text-left text-xs bg-gray-700 hover:bg-gray-600 truncate"
                      >
                        {loc.iconData || '📍'} {loc.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Shortcuts</h3>
            <div className="text-[10px] text-gray-500 space-y-1">
              <div><kbd className="bg-gray-700 px-1 rounded">1</kbd> <kbd className="bg-gray-700 px-1 rounded">2</kbd> <kbd className="bg-gray-700 px-1 rounded">3</kbd> Layers</div>
              <div><kbd className="bg-gray-700 px-1 rounded">B</kbd> Brush</div>
              <div><kbd className="bg-gray-700 px-1 rounded">E</kbd> Eraser</div>
              <div><kbd className="bg-gray-700 px-1 rounded">G</kbd> Toggle Grid</div>
              <div><kbd className="bg-gray-700 px-1 rounded">[</kbd> <kbd className="bg-gray-700 px-1 rounded">]</kbd> Brush Size</div>
              <div><kbd className="bg-gray-700 px-1 rounded">Space</kbd> Hold to Pan</div>
              <div>Right-click: Pan</div>
              <div>Scroll: Pan</div>
              <div>Ctrl+Scroll: Zoom</div>
              <div><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Close</div>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-950"
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
              imageRendering: 'pixelated',
            }}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div>
          Map: {mapData.width}×{mapData.height} tiles | 
          Layer: {activeLayer} | 
          Tool: {tool} | 
          Objects: {mapData.objects.length} | 
          Locations: {mapData.locations.length}
        </div>
        <div>
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
