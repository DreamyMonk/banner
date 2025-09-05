'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getPublishedBanners, deletePublishedBanner } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PublishedBanner {
  id: string;
  banner: string;
  createdAt: string | null;
}

export default function PublishedPage() {
  const [banners, setBanners] = useState<PublishedBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getPublishedBanners();
      setBanners(data);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await deletePublishedBanner(id);
    if (result.success) {
      setBanners(prev => prev.filter(b => b.id !== id));
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Published Banners</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map(b => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle>
                {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-md border">
                <Image src={b.banner} alt="Published banner" fill style={{ objectFit: 'contain' }} />
              </div>
              <Button variant="destructive" onClick={() => handleDelete(b.id)}>
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
