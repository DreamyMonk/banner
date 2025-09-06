'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getBannersForPhone } from './actions';
import Image from 'next/image';
import { Loader2, Download, ArrowLeft } from 'lucide-react';

const STORAGE_KEY = 'verifiedPhoneNumber';

type BannerData = {
  name: string;
  shopName: string;
  bannerUrl: string;
  bannerFileName: string;
  createdAt: string | null;
};

export default function DownloadPage() {
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [bannerData, setBannerData] = useState<BannerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    if (savedPhone) {
      setPhone(savedPhone);
      handleVerify(savedPhone, true); // Automatically verify on load
    } else {
      setIsLoading(false);
    }
    setHasCheckedStorage(true);
  }, []);

  const handleVerify = async (phoneToVerify: string, isAutoVerify = false) => {
    if (!phoneToVerify) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getBannersForPhone(phoneToVerify);
      if ('banners' in result) {
        setBannerData(result.banners);
        setIsVerified(true);
        localStorage.setItem(STORAGE_KEY, phoneToVerify);
      } else {
        setError(result.error || 'Could not retrieve banner data.');
        setIsVerified(false);
        setBannerData([]);
        localStorage.removeItem(STORAGE_KEY);
        if (!isAutoVerify) {
            toast({
              title: 'Verification Failed',
              description: result.error,
              variant: 'destructive',
            });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      if (!isAutoVerify) {
        toast({
            title: 'Error',
            description: 'An unexpected error occurred.',
            variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(phone);
  };
  
  const handleTryAnotherNumber = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsVerified(false);
    setBannerData([]);
    setPhone('');
    setError(null);
  };
  
  const handleDownload = (b: BannerData) => {
    const link = document.createElement('a');
    link.href = b.bannerUrl;
    link.download = `${b.bannerFileName}_${b.name.replace(/ /g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const shopName = bannerData.length > 0 ? bannerData[0].shopName : '';

  if (!hasCheckedStorage) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-lg shadow-lg">
        {isVerified && bannerData.length > 0 ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Your Banners for {shopName}</CardTitle>
              <CardDescription>
                Here are the banners associated with your phone number, sorted by most recent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {bannerData.map((b, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden flex flex-col group">
                    <div className="relative aspect-[1200/630] w-full bg-muted overflow-hidden">
                      <Image src={b.bannerUrl} alt={`Banner for ${b.name}`} fill style={{ objectFit: 'contain' }} unoptimized/>
                    </div>
                    <div className="p-3 bg-background flex-grow flex flex-col justify-between">
                        <div>
                            <p className="font-semibold truncate" title={b.name}>{b.name}</p>
                            {b.createdAt && <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>}
                        </div>
                        <Button onClick={() => handleDownload(b)} className="w-full mt-3" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleTryAnotherNumber} className="w-full" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use a different number
              </Button>
            </CardContent>
          </>
        ) : (
            <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Download Your Banner</CardTitle>
              <CardDescription>
                Enter your shop's phone number to see your available banners.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., +1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="text-center"
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'View My Banners'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
