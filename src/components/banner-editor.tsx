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
  RotateCw,
  Expand,
  Mail,
  FileSignature,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import type { BannerElement, Group, Shop } from '@/lib/types';
import { ElementInspector } from './element-inspector';
import { LayersPanel } from './layers-panel';
import { RecipientsPanel } from './recipients-panel';
import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  useDraggable,
  useSensor,
  PointerSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';

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
  handleDownload: () => void;
  handleLayerDragEnd: (event: DragEndEvent) => void;
  emailSubject: string;
  setEmailSubject: Dispatch<SetStateAction<string>>;
  emailBody: string;
  setEmailBody: Dispatch<SetStateAction<string>>;
}

const DraggableElement = ({
  element,
  isSelected,
  onSelect,
  onStartInteraction,
  bannerDimensions,
}: {
  element: BannerElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStartInteraction: (
    e: ReactMouseEvent,
    type: 'rotate' | 'resize',
    id: string
  ) => void;
  bannerDimensions: { width: number; height: number };
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: element.id,
  });

  const width = (element.scale / 100) * bannerDimensions.width;
  const fontSize = (element.scale / 100) * (bannerDimensions.width / 20);

  const style = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: element.type === 'logo' ? `${width}px` : 'auto',
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    opacity: element.opacity / 100,
    border: isSelected ? '2px dashed hsl(var(--primary))' : 'none',
    boxSizing: 'border-box' as const,
    cursor: 'move',
  };

  const textStyle = {
    color: element.color,
    fontSize: `${fontSize}px`,
    fontWeight: element.fontWeight,
    fontFamily: element.fontFamily,
    letterSpacing: `${element.letterSpacing || 0}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute p-2"
      onMouseDown={e => {
        e.stopPropagation();
        onSelect(element.id);
      }}
    >
      {element.type === 'logo' && (
        <div className="relative w-full h-full aspect-[1/1]">
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
        <span className="whitespace-nowrap pointer-events-none" style={textStyle}>
          {element.text}
        </span>
      )}

      {isSelected && (
        <>
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full cursor-alias flex items-center justify-center"
            onMouseDown={e => onStartInteraction(e, 'rotate', element.id)}
          >
            <RotateCw className="w-3 h-3 text-primary-foreground" />
          </div>
          <div
            className="absolute -bottom-3 -right-3 w-5 h-5 bg-primary rounded-full cursor-se-resize flex items-center justify-center"
            onMouseDown={e => onStartInteraction(e, 'resize', element.id)}
          >
            <Expand className="w-3 h-3 text-primary-foreground" />
          </div>
        </>
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
  handleDownload,
  handleLayerDragEnd,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
}: BannerEditorProps) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bannerDimensions, setBannerDimensions] = useState({ width: 1200, height: 630 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (bannerImage) {
      const img = document.createElement('img');
      img.src = bannerImage;
      img.onload = () => {
        setBannerDimensions({ width: img.width, height: img.height });
      };
    }
  }, [bannerImage]);

  useEffect(() => {
    // Fit canvas to view on load/change
    if (editorWrapperRef.current && containerRef.current) {
      const { width: wrapperWidth, height: wrapperHeight } =
        editorWrapperRef.current.getBoundingClientRect();
      const newZoom = Math.min(
        wrapperWidth / (bannerDimensions.width + 40), // Add padding
        wrapperHeight / (bannerDimensions.height + 40)
      );
      setZoom(Math.max(0.1, newZoom));
    }
  }, [bannerDimensions]);


  const interactionRef = useRef<{
    type: 'rotate' | 'resize' | null;
    elementId: string | null;
    startX: number;
    startY: number;
    startRotation: number;
    startScale: number;
    centerX: number;
    centerY: number;
  }>({
    type: null,
    elementId: null,
    startX: 0,
    startY: 0,
    startRotation: 0,
    startScale: 0,
    centerX: 0,
    centerY: 0,
  });

  const handleElementDragEnd = ({ delta, active }: DragEndEvent) => {
    if (interactionRef.current.type) return;

    const element = elements.find(el => el.id === active.id);
    if (!element || !containerRef.current) return;

    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();

    const newX = element.x + (delta.x / containerWidth) * 100;
    const newY = element.y + (delta.y / containerHeight) * 100;

    updateElement(active.id as string, {
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
    });
  };

  const handleInteractionStart = (
    e: ReactMouseEvent,
    type: 'rotate' | 'resize',
    elementId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const element = elements.find(el => el.id === elementId);
    if (!element || !containerRef.current) return;

    const elemNode = (e.target as HTMLElement).closest('.absolute');
    if (!elemNode) return;
    const elemRect = elemNode.getBoundingClientRect();
    const centerX = elemRect.left + elemRect.width / 2;
    const centerY = elemRect.top + elemRect.height / 2;

    interactionRef.current = {
      type,
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      startRotation: element.rotation,
      startScale: element.scale,
      centerX,
      centerY,
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const interaction = interactionRef.current;
      if (!interaction.type || !interaction.elementId) return;

      e.preventDefault();
      e.stopPropagation();

      if (interaction.type === 'rotate') {
        const angle =
          Math.atan2(e.clientY - interaction.centerY, e.clientX - interaction.centerX) *
          (180 / Math.PI);
        updateElement(interaction.elementId, { rotation: Math.round(angle + 90) });
      }

      if (interaction.type === 'resize') {
        const dx = e.clientX - interaction.startX;
        const dy = e.clientY - interaction.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const direction = e.clientX > interaction.startX || e.clientY > interaction.startY ? 1 : -1;
        
        const newScale = interaction.startScale + (distance / bannerDimensions.width) * 100 * direction;
        updateElement(interaction.elementId, { scale: Math.max(1, Math.min(200, newScale)) });
      }
    },
    [updateElement, bannerDimensions.width]
  );

  const handleMouseUp = useCallback(() => {
    interactionRef.current.type = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const sensors = useSensor(PointerSensor);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6 h-full">
      <div className="lg:col-span-2 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 relative" ref={editorWrapperRef}>
        <DndContext onDragEnd={handleElementDragEnd} sensors={[sensors]}>
          <div
            id="banner-container"
            ref={containerRef}
            className="relative overflow-hidden shadow-lg bg-card rounded-lg flex-shrink-0"
            style={{
              width: bannerDimensions.width,
              height: bannerDimensions.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            onClick={() => setSelectedElementId(null)}
          >
            {bannerImage ? (
              <Image
                src={bannerImage}
                alt="Banner background"
                fill
                className="object-cover"
                data-ai-hint="social media banner"
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <div className="text-center text-muted-foreground p-4">
                  <ImagePlus className="mx-auto h-12 w-12" />
                  <p className="mt-2 text-sm md:text-base">
                    Upload a banner to get started
                  </p>
                </div>
              </div>
            )}

            {elements.map(element => (
              <DraggableElement
                key={element.id}
                element={element}
                onSelect={setSelectedElementId}
                onStartInteraction={handleInteractionStart}
                isSelected={selectedElement?.id === element.id}
                bannerDimensions={bannerDimensions}
              />
            ))}
          </div>
        </DndContext>
         <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card p-1 rounded-lg shadow-md">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}><ZoomOut /></Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(1)}><Maximize /></Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.1))}><ZoomIn /></Button>
        </div>
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
                Actions
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent
            value="setup"
            className="flex-1 overflow-y-auto px-4 md:px-6 pb-6"
          >
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
                  <Button variant="outline" onClick={() => addElement('logo')}>
                    <ImagePlus className="mr-2" /> Logo
                  </Button>
                  <Button variant="outline" onClick={() => addElement('text')}>
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
          <TabsContent
            value="send"
            className="flex-1 flex flex-col px-4 md:px-6 pb-6 overflow-y-auto"
          >
            <div className="space-y-6 flex-1 flex flex-col">
              <div>
                <h3 className="text-lg font-headline mb-2 flex items-center gap-2">
                  <Users />
                  Recipients
                </h3>
                <RecipientsPanel
                  groups={groups}
                  shops={shops}
                  selectedGroups={selectedGroups}
                  setSelectedGroups={setSelectedGroups}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-headline mb-2 flex items-center gap-2">
                  <FileSignature />
                  Email Subject
                </h3>
                <Input
                  placeholder="Enter your email subject. Use {{shopName}} as a placeholder."
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-lg font-headline mb-2 flex items-center gap-2">
                  <Mail />
                  Email Body
                </h3>
                <Textarea
                  placeholder="Enter your email content here. Use {{shopName}} as a placeholder."
                  className="flex-1"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
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
                      <Send className="mr-2" /> Send Emails
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2" /> Download All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
