export interface Product {
  name: string;
  image: string; // Data URI
}

export interface Shop {
  id: string;
  name: string;
  email: string;
  logo?: string; // Data URI
  address?: string;
  phone?: string;
  groups: string[]; // Array of group IDs
  status: 'active' | 'suspended';
  duration?: number | null; // Subscription duration in days
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
  products?: Product[];
}

export interface Group {
  id: string;
  name:string;
}

export type BannerElement = {
  id: string;
  type: 'logo' | 'text' | 'product1' | 'product2' | 'product3' | 'product4';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  text?: string;
  color?: string;
  fontWeight?: number;
  fontFamily?: string;
  letterSpacing?: number;
};
