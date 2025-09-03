export interface Shop {
  id: string;
  name: string;
  email: string;
  logo: string; // Data URI
  groups: string[]; // Array of group IDs
}

export interface Group {
  id: string;
  name:string;
}

export type BannerElement = {
  id: string;
  type: 'logo' | 'text';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  text?: string;
  color?: string;
  fontWeight?: number;
  fontFamily?: string;
};
