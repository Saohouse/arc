"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableItem = {
  id: string;
  order: number;
  [key: string]: any;
};

type SortableListProps<T extends SortableItem> = {
  items: T[];
  onReorder: (items: T[]) => Promise<void>;
  renderItem: (item: T) => React.ReactNode;
  itemClassName?: string;
};

function SortableItemWrapper({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 ${className || ""}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  itemClassName,
}: SortableListProps<T>) {
  const [localItems, setLocalItems] = useState(items);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only enable drag-and-drop after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localItems.findIndex((item) => item.id === active.id);
    const newIndex = localItems.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(localItems, oldIndex, newIndex);
    
    // Update order values based on new positions
    const itemsWithNewOrder = reorderedItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    setLocalItems(itemsWithNewOrder);
    setIsSaving(true);

    try {
      await onReorder(itemsWithNewOrder);
    } catch (error) {
      console.error("Failed to save new order:", error);
      // Revert on error
      setLocalItems(items);
    } finally {
      setIsSaving(false);
    }
  };

  // Show simple list during SSR/initial hydration
  if (!mounted) {
    return (
      <div className="space-y-2">
        {localItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="text-muted-foreground/40">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1">{renderItem(item)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {isSaving && (
        <div className="absolute top-0 right-0 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Saving order...
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localItems.map((item) => (
              <SortableItemWrapper
                key={item.id}
                id={item.id}
                className={itemClassName}
              >
                {renderItem(item)}
              </SortableItemWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
