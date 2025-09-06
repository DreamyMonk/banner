import { Suspense } from 'react';
import { getBannersForPhone } from './actions';
import { DownloadClient } from './client';
import { Loader2 } from 'lucide-react';

async function DownloadContent({ phone }: { phone?: string }) {
  let bannerDataResult;
  if (phone) {
    bannerDataResult = await getBannersForPhone(phone);
    if ('banners' in bannerDataResult) {
        bannerDataResult.banners.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        });
    }
  }

  return <DownloadClient initialPhone={phone} initialBannerDataResult={bannerDataResult} />;
}

export default function DownloadPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const phone = typeof searchParams?.phone === 'string' ? searchParams.phone : undefined;

  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    }>
      <DownloadContent phone={phone} />
    </Suspense>
  );
}
