import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ImagePlus,
  Type,
  Users,
  Send,
  Loader2,
  Settings2,
} from 'lucide-react';
import type { BannerElement, Group, Shop } from '@/lib/types';
import { ElementInspector } from './element-inspector';
import { LayersPanel } from './layers-panel';
import { RecipientsPanel } from './recipients-panel';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { DndContext, useDraggable, useSensor, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface BannerEditorProps {
  bannerImage: string | null;
  handleBannerImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  elements: BannerElement[];
  selectedElement: BannerElement | undefined;
  setSelectedElementId: (id: string | null) => void;
  updateElement: (id: string, newProps: Partial<BannerElement>) => void;
  removeElement: (id: string) => void;
  addElement: (type: 'logo' | 'text') => void;
  shops: Shop[];
  groups: Group[];
  selectedGroups: string[];
  setSelectedGroups: Dispatch<SetStateAction<string[]>>;
  isSending: boolean;
  handleSend: () => void;
  handleLayerDragEnd: (event: DragEndEvent) => void;
}

const DraggableElement = ({
  element,
  updateElement,
  setSelectedElementId,
  isSelected,
}: {
  element: BannerElement;
  updateElement: (id: string, newProps: Partial<BannerElement>) => void;
  setSelectedElementId: (id: string | null) => void;
  isSelected: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: element.id,
  });

  const style = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: element.type === 'logo' ? `${element.scale}%` : 'auto',
    height: element.type === 'logo' ? 'auto' : `${element.scale}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    opacity: element.opacity / 100,
    aspectRatio: element.type === 'logo' ? '1 / 1' : undefined,
    border: isSelected ? '2px dashed hsl(var(--primary))' : 'none',
    boxSizing: 'border-box' as const,
    cursor: 'move',
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute p-2"
      onClick={(e) => { e.stopPropagation(); setSelectedElementId(element.id); }}
      onMouseDown={(e) => { e.stopPropagation(); setSelectedElementId(element.id); }}
    >
      {element.type === 'logo' && (
        <div className="relative w-full h-full">
          <Image
            src="https://picsum.photos/200/200"
            alt="Placeholder Logo"
            fill
            className="object-contain pointer-events-none"
            data-ai-hint="company logo"
          />
        </div>
      )}
      {element.type === 'text' && (
        <span
          className="font-headline whitespace-nowrap pointer-events-none"
          style={{
            color: element.color,
            fontSize: 'clamp(8px, 4vw, 120px)', // Responsive font size
            fontWeight: element.fontWeight,
            textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {element.text}
        </span>
      )}
    </div>
  );
};


export function BannerEditor({
  bannerImage,
  handleBannerImageUpload,
  elements,
  selectedElement,
  setSelectedElementId,
  updateElement,
  removeElement,
  addElement,
  shops,
  groups,
  selectedGroups,
  setSelectedGroups,
  isSending,
  handleSend,
  handleLayerDragEnd,
}: BannerEditorProps) {
  
  const handleElementDragEnd = ({ delta, active }: DragEndEvent) => {
    const element = elements.find(el => el.id === active.id);
    if (!element) return;
    
    // This needs to be relative to the container size
    const container = document.getElementById('banner-container');
    if (!container) return;

    const newX = element.x + (delta.x / container.clientWidth) * 100;
    const newY = element.y + (delta.y / container.clientHeight) * 100;
    
    updateElement(active.id as string, {
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
    });
  };

  const sensors = useSensor(PointerSensor);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full">
      <div className="lg:col-span-2">
        <DndContext onDragEnd={handleElementDragEnd} sensors={[sensors]}>
          <div
            id="banner-container"
            className="h-full w-full aspect-[1200/630] max-h-[calc(100vh-10rem)] relative overflow-hidden shadow-lg bg-card"
            onClick={() => setSelectedElementId(null)}
          >
            {bannerImage ? (
              <Image
                src={bannerImage}
                alt="Banner background"
                fill
                className="object-cover"
                data-ai-hint="social media banner"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <div className="text-center text-muted-foreground">
                  <ImagePlus className="mx-auto h-12 w-12" />
                  <p className="mt-2">Upload a banner to get started</p>
                </div>
              </div>
            )}

            {elements.map(element => (
              <DraggableElement
                key={element.id}
                element={element}
                updateElement={updateElement}
                setSelectedElementId={setSelectedElementId}
                isSelected={selectedElement?.id === element.id}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <Card className="shadow-lg">
        <Tabs defaultValue="setup" className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">
                <Settings2 className="w-4 h-4 mr-2" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="send">
                <Send className="w-4 h-4 mr-2" />
                Send
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="setup" className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-headline mb-2">Banner</h3>
                <Input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  className="file:text-primary file:font-semibold"
                />
              </div>

              <div>
                <h3 className="text-lg font-headline mb-2">Elements</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => addElement('logo')}
                  >
                    <ImagePlus className="mr-2" /> Logo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addElement('text')}
                  >
                    <Type className="mr-2" /> Text
                  </Button>
                </div>
              </div>

              <LayersPanel
                elements={elements}
                selectedElementId={selectedElement?.id ?? null}
                setSelectedElementId={setSelectedElementId}
                removeElement={removeElement}
                onDragEnd={handleLayerDragEnd}
              />

              {selectedElement && (
                <ElementInspector
                  element={selectedElement}
                  updateElement={updateElement}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="send" className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto">
            <div className="space-y-6 flex-1 flex flex-col">
              <div>
                <h3 className="text-lg font-headline mb-2 flex items-center gap-2">
                  <Users />Recipients
                </h3>
                <RecipientsPanel
                  groups={groups}
                  shops={shops}
                  selectedGroups={selectedGroups}
                  setSelectedGroups={setSelectedGroups}
                />
              </div>
              <div className='flex-1 flex flex-col'>
                <h3 className="text-lg font-headline mb-2">Email Preview</h3>
                <div
                  className="flex-1 bg-muted/50 font-mono text-xs p-2 rounded-md overflow-auto text-center"
                >
                  <p>An email with the final banner will be sent.</p>
                  <p className='text-xs text-muted-foreground mt-1'>You must install the 'Trigger Email' Firebase Extension.</p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleSend}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" /> Generate & Send Banners
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
