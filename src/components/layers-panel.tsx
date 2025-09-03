import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { BannerElement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Image, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface LayersPanelProps {
  elements: BannerElement[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  removeElement: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

export function LayersPanel({ elements, selectedElementId, setSelectedElementId, removeElement, onDragEnd }: LayersPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  return (
    <div>
        <h3 className="text-lg font-headline mb-2">Layers</h3>
        <div className="space-y-2 p-2 border rounded-md min-h-[6rem]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={elements} strategy={verticalListSortingStrategy}>
              {elements.map(element => (
                  <SortableItem 
                      key={element.id} 
                      id={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      onSelect={() => setSelectedElementId(element.id)}
                      onRemove={() => removeElement(element.id)}
                  />
              ))}
            </SortableContext>
          </DndContext>
          {elements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center pt-4">No elements added yet.</p>
          )}
        </div>
    </div>
  );
}

function SortableItem({ element, isSelected, onSelect, onRemove }: { id: string, element: BannerElement, isSelected: boolean, onSelect: () => void, onRemove: () => void}) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({id: element.id});
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center p-2 rounded-md transition-colors cursor-pointer",
          isSelected ? 'bg-primary/20' : 'hover:bg-muted'
        )}
        onClick={onSelect}
      >
        <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2 ml-2">
            {element.type === 'logo' ? <Image className="h-4 w-4" /> : <Type className="h-4 w-4" />}
            <span className="text-sm font-medium truncate">
                {element.type === 'logo' ? 'Logo' : element.text}
            </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }
