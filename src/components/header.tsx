'use client';

import { Bee } from 'lucide-react';
import { ShopManager } from './shop-manager';
import type { Shop, Group } from '@/lib/types';
import type { Dispatch, SetStateAction } from 'react';

interface HeaderProps {
  shops: Shop[];
  setShops: Dispatch<SetStateAction<Shop[]>>;
  groups: Group[];
  setGroups: Dispatch<SetStateAction<Group[]>>;
}

export function Header({ shops, setShops, groups, setGroups }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-2">
        <Bee className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-headline text-foreground">BannerBee</h1>
      </div>
      <ShopManager
        shops={shops}
        setShops={setShops}
        groups={groups}
        setGroups={setGroups}
      />
    </header>
  );
}
