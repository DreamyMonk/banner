'use client';

import type { BannerElement } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const googleFonts = [
  'Roboto',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Playfair Display',
  'Poppins',
  'Nunito',
  'Belleza',
  'Alegreya',
];

interface ElementInspectorProps {
  element: BannerElement;
  updateElement: (id: string, newProps: Partial<BannerElement>) => void;
}

export function ElementInspector({
  element,
  updateElement,
}: ElementInspectorProps) {
  const handleValueChange = (key: keyof BannerElement, value: any) => {
    updateElement(element.id, { [key]: value });
  };

  const handleSliderChange = (key: keyof BannerElement, value: number[]) => {
    updateElement(element.id, { [key]: value[0] });
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-headline">Inspector</h3>
      {element.type === 'text' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="text-content">Text Content</Label>
            <Input
              id="text-content"
              value={element.text}
              onChange={e => handleValueChange('text', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="font-family">Font</Label>
            <Select
              value={element.fontFamily}
              onValueChange={value => handleValueChange('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {googleFonts.map(font => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="text-color">Color</Label>
              <Input
                id="text-color"
                type="color"
                value={element.color}
                onChange={e => handleValueChange('color', e.target.value)}
                className="p-1"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="font-weight">Font Weight</Label>
              <Slider
                id="font-weight"
                value={[element.fontWeight || 400]}
                onValueChange={val =>
                  handleValueChange('fontWeight', val[0])
                }
                min={100}
                max={900}
                step={100}
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Position (X, Y)</Label>
        <div className="flex items-center gap-2">
          <Slider
            value={[element.x]}
            onValueChange={val => handleSliderChange('x', val)}
            min={0}
            max={100}
            step={1}
          />
          <Slider
            value={[element.y]}
            onValueChange={val => handleSliderChange('y', val)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Scale ({element.scale}%)</Label>
        <Slider
          value={[element.scale]}
          onValueChange={val => handleSliderChange('scale', val)}
          min={1}
          max={100}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label>Rotation ({element.rotation}°)</Label>
        <Slider
          value={[element.rotation]}
          onValueChange={val => handleSliderChange('rotation', val)}
          min={-180}
          max={180}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label>Opacity ({element.opacity}%)</Label>
        <Slider
          value={[element.opacity]}
          onValueChange={val => handleSliderChange('opacity', val)}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}
