'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getPublishedBanners, deletePublishedBanner } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react';

interface PublishedBanner {
  id: string;
  name: string;
  banner: string;
  createdAt: string | null;
}

export default function PublishedPage() {
  const [banners, setBanners] = useState<PublishedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBanners = async () => {
    const data = await getPublishedBanners();
    // Sort banners by creation date, newest first
    data.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
    });
    setBanners(data);
  };

  useEffect(() => {
    setLoading(true);
    fetchBanners().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBanners();
    setIsRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deletePublishedBanner(id);
    if (result.success) {
      setBanners(prev => prev.filter(b => b.id !== id));
    }
  };

  if (loading) {
    return <div className="p-4 flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold tracking-tight">Published Banners</h1>
            <p className="text-muted-foreground mt-1">A list of all your published base banners.</p>
        </div>
        <div className="flex items-center gap-2">
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
                  <Image src={b.banner} alt={b.name} fill style={{ objectFit: 'contain' }} />
                </div>
                <Button variant="destructive" className="w-full" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
