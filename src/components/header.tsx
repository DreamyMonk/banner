'use client';

import { ShopManager } from './shop-manager';
import type { Shop, Group } from '@/lib/types';

const BeeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 6h2l4 4-6 6h-4l-4-4 6-6h2" />
    <path d="M12 8V5" />
    <path d="M15 9l1-1" />
    <path d="M9 9l-1-1" />
  </svg>
);

interface HeaderProps {
  shops: Shop[];
  groups: Group[];
}

export function Header({ shops, groups }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-2">
        <BeeIcon className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-headline text-foreground">BannerBee</h1>
      </div>
      <div className='flex items-center gap-4'>
        <ShopManager
          shops={shops}
          groups={groups}
        />
      </div>
    </header>
  );
}
