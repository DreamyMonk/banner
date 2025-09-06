'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getPublishedBanners, deletePublishedBanner, deleteAllPublishedBanners } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface PublishedBanner {
  id: string;
  name: string;
  bannerUrl: string;
  createdAt: string | null;
}

export function PublishedBannersClient({ initialBanners }: { initialBanners: PublishedBanner[] }) {
  const [banners, setBanners] = useState<PublishedBanner[]>(initialBanners);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBanners = async () => {
    const data = await getPublishedBanners();
    data.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
    });
    setBanners(data);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBanners();
    setIsRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deletePublishedBanner(id);
    if (result.success) {
      setBanners(prev => prev.filter(b => b.id !== id));
    } else {
      alert(`Failed to delete banner: ${result.error}`);
    }
    setDeletingId(null);
  };

  const handleDeleteAll = async () => {
    const result = await deleteAllPublishedBanners();
    if (result.success) {
      setBanners([]);
    } else {
      alert(`Failed to delete all banners: ${result.error}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold tracking-tight">Published Banners</h1>
            <p className="text-muted-foreground mt-1">A list of all your published base banners.</p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={banners.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all published and shared banners.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
            <Link href="/" passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Editor
                </Button>
            </Link>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>
      </header>
      
      {banners.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {banners.map(b => (
            <Card key={b.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="p-4 bg-muted/50 border-b">
                <CardTitle className="text-lg font-semibold truncate" title={b.name}>{b.name}</CardTitle>
                 {b.createdAt && (
                    <CardDescription className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-md border bg-muted">
                  <Image src={b.bannerUrl} alt={b.name} fill style={{ objectFit: 'contain' }} unoptimized />
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                >
                  {deletingId === b.id ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {deletingId === b.id ? 'Deleting...' : 'Delete'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-6 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-xl font-medium text-muted-foreground">No Banners Yet</h2>
          <p className="text-sm text-muted-foreground mt-2">You haven't published any banners. Once you do, they will appear here.</p>
        </div>
      )}
    </div>
  );
}
