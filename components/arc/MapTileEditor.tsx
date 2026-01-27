"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Terrain types with their colors and properties
export const TERRAIN_TYPES = {
  grass: { name: 'Grass', color: '#86EFAC', icon: '🌿' },
  grassDark: { name: 'Dark Grass', color: '#4ADE80', icon: '🌲' },
  dirt: { name: 'Dirt', color: '#D4A574', icon: '🟤' },
  sand: { name: 'Sand', color: '#FDE68A', icon: '🏖️' },
  water: { name: 'Water', color: '#60A5FA', icon: '🌊' },
  waterDeep: { name: 'Deep Water', color: '#3B82F6', icon: '🌀' },
  stone: { name: 'Stone', color: '#9CA3AF', icon: '🪨' },
  snow: { name: 'Snow', color: '#F1F5F9', icon: '❄️' },
  forest: { name: 'Forest', color: '#166534', icon: '🌳' },
  mountain: { name: 'Mountain', color: '#78716C', icon: '⛰️' },
  lava: { name: 'Lava', color: '#EF4444', icon: '🌋' },
  swamp: { name: 'Swamp', color: '#65A30D', icon: '🐸' },
} as const;

export type TerrainType = keyof typeof TERRAIN_TYPES;

// Tool types
export type ToolType = 'brush' | 'eraser' | 'fill' | 'eyedropper';

// Brush sizes
export const BRUSH_SIZES = [1, 2, 3, 5, 8] as const;
export type BrushSize = typeof BRUSH_SIZES[number];

interface MapTileEditorProps {
  gridSize?: number;
  tileSize?: number;
  initialTiles?: (TerrainType | null)[][];
  onTilesChange?: (tiles: (TerrainType | null)[][]) => void;
  onClose?: () => void;
}

export function MapTileEditor({
  gridSize = 64,
  tileSize = 16,
  initialTiles,
  onTilesChange,
  onClose,
}: MapTileEditorProps) {
  // Tile grid state
  const [tiles, setTiles] = useState<(TerrainType | null)[][]>(() => {
    if (initialTiles) return initialTiles;
    // Initialize empty grid
    return Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
  });

  // Editor state
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('grass');
  const [selectedTool, setSelectedTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState<BrushSize>(2);
  const [isPainting, setIsPainting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate canvas dimensions
  const canvasWidth = gridSize * tileSize;
  const canvasHeight = gridSize * tileSize;

  // Draw the tile grid
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill background with water (default empty = water)
    ctx.fillStyle = TERRAIN_TYPES.water.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const terrain = tiles[y][x];
        if (terrain) {
          ctx.fillStyle = TERRAIN_TYPES[terrain].color;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // Draw grid lines if enabled
    if (showGrid && zoom >= 0.5) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= gridSize; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, canvasHeight);
        ctx.stroke();
      }
      
      for (let y = 0; y <= gridSize; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(canvasWidth, y * tileSize);
        ctx.stroke();
      }
    }
  }, [tiles, gridSize, tileSize, showGrid, zoom, canvasWidth, canvasHeight]);

  // Redraw when tiles or settings change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get tile coordinates from mouse position
  const getTileCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / tileSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / tileSize);
    
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      return { x, y };
    }
    return null;
  };

  // Paint tiles with brush
  const paintTiles = (centerX: number, centerY: number) => {
    const newTiles = tiles.map(row => [...row]);
    const radius = Math.floor(brushSize / 2);
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        // Check bounds
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          // Circular brush check
          if (dx * dx + dy * dy <= radius * radius + radius) {
            if (selectedTool === 'brush') {
              newTiles[y][x] = selectedTerrain;
            } else if (selectedTool === 'eraser') {
              newTiles[y][x] = null;
            }
          }
        }
      }
    }
    
    setTiles(newTiles);
    onTilesChange?.(newTiles);
  };

  // Flood fill algorithm
  const floodFill = (startX: number, startY: number) => {
    const targetTerrain = tiles[startY][startX];
    if (targetTerrain === selectedTerrain) return;
    
    const newTiles = tiles.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (newTiles[y][x] !== targetTerrain) continue;
      
      visited.add(key);
      newTiles[y][x] = selectedTerrain;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    setTiles(newTiles);
    onTilesChange?.(newTiles);
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click for panning
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (e.button !== 0) return;
    
    const coords = getTileCoords(e);
    if (!coords) return;
    
    if (selectedTool === 'fill') {
      floodFill(coords.x, coords.y);
    } else if (selectedTool === 'eyedropper') {
      const terrain = tiles[coords.y][coords.x];
      if (terrain) {
        setSelectedTerrain(terrain);
        setSelectedTool('brush');
      }
    } else {
      setIsPainting(true);
      paintTiles(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (!isPainting) return;
    
    const coords = getTileCoords(e);
    if (coords) {
      paintTiles(coords.x, coords.y);
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
    setIsPanning(false);
  };

  // Zoom with scroll wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.25, Math.min(4, prev * delta)));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b') setSelectedTool('brush');
      if (e.key === 'e') setSelectedTool('eraser');
      if (e.key === 'g') setSelectedTool('fill');
      if (e.key === 'i') setSelectedTool('eyedropper');
      if (e.key === '[') setBrushSize(prev => BRUSH_SIZES[Math.max(0, BRUSH_SIZES.indexOf(prev) - 1)]);
      if (e.key === ']') setBrushSize(prev => BRUSH_SIZES[Math.min(BRUSH_SIZES.length - 1, BRUSH_SIZES.indexOf(prev) + 1)]);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll lock when hovering
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    if (isHovering) {
      const preventScroll = (e: WheelEvent) => e.preventDefault();
      document.body.style.overflow = 'hidden';
      window.addEventListener('wheel', preventScroll, { passive: false });
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('wheel', preventScroll);
      };
    }
  }, [isHovering]);

  // Clear all tiles
  const clearAll = () => {
    if (confirm('Clear all tiles? This cannot be undone.')) {
      const empty = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
      setTiles(empty);
      onTilesChange?.(empty);
    }
  };

  // Fill all with selected terrain
  const fillAll = () => {
    const filled = Array(gridSize).fill(null).map(() => Array(gridSize).fill(selectedTerrain));
    setTiles(filled);
    onTilesChange?.(filled);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-3 bg-gray-800 border-b border-gray-700">
        {/* Tools */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-2">Tools:</span>
          {([
            { tool: 'brush' as ToolType, icon: '🖌️', label: 'Brush (B)', key: 'B' },
            { tool: 'eraser' as ToolType, icon: '🧹', label: 'Eraser (E)', key: 'E' },
            { tool: 'fill' as ToolType, icon: '🪣', label: 'Fill (G)', key: 'G' },
            { tool: 'eyedropper' as ToolType, icon: '💧', label: 'Eyedropper (I)', key: 'I' },
          ]).map(({ tool, icon, label }) => (
            <button
              key={tool}
              onClick={() => setSelectedTool(tool)}
              className={`p-2 rounded text-lg ${selectedTool === tool ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-2">Size:</span>
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm ${brushSize === size ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={`Brush size ${size}`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded ${showGrid ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          title="Toggle grid"
        >
          #
        </button>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setZoom(z => Math.max(0.25, z * 0.8))} className="p-2 bg-gray-700 hover:bg-gray-600 rounded">−</button>
          <span className="text-xs w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.25))} className="p-2 bg-gray-700 hover:bg-gray-600 rounded">+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs">Reset</button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={fillAll} className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-xs">Fill All</button>
          <button onClick={clearAll} className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-xs">Clear</button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-xs">Close Editor</button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Terrain palette */}
        <div className="w-48 bg-gray-800 border-r border-gray-700 p-3 overflow-y-auto">
          <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Terrain</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TERRAIN_TYPES).map(([key, terrain]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTerrain(key as TerrainType);
                  setSelectedTool('brush');
                }}
                className={`p-2 rounded flex flex-col items-center gap-1 transition-colors ${
                  selectedTerrain === key 
                    ? 'ring-2 ring-indigo-500 bg-gray-700' 
                    : 'bg-gray-750 hover:bg-gray-700'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded border border-gray-600"
                  style={{ backgroundColor: terrain.color }}
                />
                <span className="text-[10px] text-gray-300">{terrain.icon}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Shortcuts</h3>
            <div className="text-[10px] text-gray-500 space-y-1">
              <div><kbd className="bg-gray-700 px-1 rounded">B</kbd> Brush</div>
              <div><kbd className="bg-gray-700 px-1 rounded">E</kbd> Eraser</div>
              <div><kbd className="bg-gray-700 px-1 rounded">G</kbd> Fill</div>
              <div><kbd className="bg-gray-700 px-1 rounded">I</kbd> Eyedropper</div>
              <div><kbd className="bg-gray-700 px-1 rounded">[</kbd> <kbd className="bg-gray-700 px-1 rounded">]</kbd> Brush size</div>
              <div><kbd className="bg-gray-700 px-1 rounded">Alt</kbd>+Drag Pan</div>
              <div><kbd className="bg-gray-700 px-1 rounded">Scroll</kbd> Zoom</div>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-950 flex items-center justify-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => { setIsHovering(false); handleMouseUp(); }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className={`border border-gray-600 ${
                selectedTool === 'brush' || selectedTool === 'eraser' 
                  ? 'cursor-crosshair' 
                  : selectedTool === 'fill' 
                    ? 'cursor-cell' 
                    : 'cursor-pointer'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div>
          Grid: {gridSize}×{gridSize} | Tile: {tileSize}px | 
          Tool: {selectedTool} | Terrain: {TERRAIN_TYPES[selectedTerrain].name}
        </div>
        <div>
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
