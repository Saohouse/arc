"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

type EntityType = "character" | "world" | "location" | "object";

type RelationshipData = {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  sourceName: string;
  targetType: EntityType;
  targetId: string;
  targetName: string;
  type: string;
};

type RelationshipGraphProps = {
  relationships: RelationshipData[];
};

const getEntityColor = (type: EntityType) => {
  switch (type) {
    case "character":
      return { bg: "#dbeafe", border: "#3b82f6" }; // blue
    case "world":
      return { bg: "#e9d5ff", border: "#a855f7" }; // purple
    case "location":
      return { bg: "#d1fae5", border: "#10b981" }; // emerald
    case "object":
      return { bg: "#fef3c7", border: "#f59e0b" }; // amber
    default:
      return { bg: "#f3f4f6", border: "#6b7280" }; // gray
  }
};

const getEntityEmoji = (type: EntityType) => {
  switch (type) {
    case "character":
      return "👤";
    case "world":
      return "🌍";
    case "location":
      return "📍";
    case "object":
      return "🔮";
    default:
      return "❓";
  }
};

export function RelationshipGraph({ relationships }: RelationshipGraphProps) {
  // Build nodes from unique entities
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const entityMap = new Map<string, { name: string; type: EntityType }>();

    relationships.forEach((rel) => {
      entityMap.set(`${rel.sourceType}-${rel.sourceId}`, {
        name: rel.sourceName,
        type: rel.sourceType,
      });
      entityMap.set(`${rel.targetType}-${rel.targetId}`, {
        name: rel.targetName,
        type: rel.targetType,
      });
    });

    // Create nodes in a circular layout
    const entities = Array.from(entityMap.entries());
    const radius = Math.max(300, entities.length * 40);
    const centerX = 400;
    const centerY = 300;

    const nodes: Node[] = entities.map(([key, entity], index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const colors = getEntityColor(entity.type);

      return {
        id: key,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div className="text-xl">{getEntityEmoji(entity.type)}</div>
              <div className="text-sm font-semibold">{entity.name}</div>
            </div>
          ),
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: "8px",
          padding: "12px",
          minWidth: "120px",
        },
      };
    });

    // Create edges
    const edges: Edge[] = relationships.map((rel) => {
      const sourceKey = `${rel.sourceType}-${rel.sourceId}`;
      const targetKey = `${rel.targetType}-${rel.targetId}`;

      return {
        id: rel.id,
        source: sourceKey,
        target: targetKey,
        label: rel.type,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          stroke: "#64748b",
          strokeWidth: 2,
        },
        labelStyle: {
          fill: "#475569",
          fontSize: 12,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.9,
        },
      };
    });

    return { nodes, edges };
  }, [relationships]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (relationships.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
        No relationships to visualize. Create some relationships to see the
        graph.
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full rounded border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const type = node.id.split("-")[0] as EntityType;
            return getEntityColor(type).bg;
          }}
        />
      </ReactFlow>
    </div>
  );
}
