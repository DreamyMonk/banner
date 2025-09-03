// src/app/download/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getBannerData, verifyPhoneNumber } from './actions';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

function DownloadPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [bannerData, setBannerData] = useState<{ name: string; banner: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Invalid download link. Please check the URL and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await verifyPhoneNumber(id, phone);
      if (result.success) {
        const data = await getBannerData(id);
        if (data) {
          setBannerData(data);
          setIsVerified(true);
        } else {
          setError('Could not retrieve banner data. The link may have expired.');
        }
      } else {
        setError(result.error || 'Incorrect phone number. Please try again.');
        toast({
            title: 'Verification Failed',
            description: result.error || 'Incorrect phone number. Please try again.',
            variant: 'destructive'
        });
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (bannerData) {
        const link = document.createElement('a');
        link.href = bannerData.banner;
        link.download = `${bannerData.name.replace(/ /g, '_')}_banner.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        {!isVerified ? (
          <>
            <CardHeader>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>
                To access your personalized banner, please enter the phone number associated with your shop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & View Banner
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          bannerData && (
            <>
              <CardHeader>
                <CardTitle>Your Banner for {bannerData.name}</CardTitle>
                <CardDescription>
                  Your banner is ready. Click the button below to download it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-md border">
                    <Image src={bannerData.banner} alt={`Banner for ${bannerData.name}`} layout="fill" objectFit="contain" />
                </div>
                <Button onClick={handleDownload} className="w-full" size="lg">
                  Download Image
                </Button>
              </CardContent>
            </>
          )
        )}
      </Card>
    </div>
  );
}


export default function DownloadPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DownloadPageContent />
        </Suspense>
    )
}
