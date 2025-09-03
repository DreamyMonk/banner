'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getBannerForPhone } from './actions';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'verifiedPhoneNumber';

export default function DownloadPage() {
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [bannerData, setBannerData] = useState<{ name: string; banner: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading to check storage
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    if (savedPhone) {
      setPhone(savedPhone);
      handleVerify(savedPhone);
    } else {
      setIsLoading(false);
    }
    setHasCheckedStorage(true);
  }, []);

  const handleVerify = async (phoneToVerify: string) => {
    if (!phoneToVerify) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getBannerForPhone(phoneToVerify);
      if ('banner' in result) {
        setBannerData(result);
        setIsVerified(true);
        localStorage.setItem(STORAGE_KEY, phoneToVerify);
      } else {
        setError(result.error || 'Could not retrieve banner data.');
        setIsVerified(false);
        setBannerData(null);
        localStorage.removeItem(STORAGE_KEY); // Clear invalid saved number
        toast({
            title: 'Verification Failed',
            description: result.error,
            variant: 'destructive'
        });
      }
    } catch (err) {
      setError('An unexpected error occurred.');
       toast({
            title: 'Error',
            description: 'An unexpected error occurred.',
            variant: 'destructive'
        });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(phone);
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
  };

  const handleTryAnotherNumber = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsVerified(false);
    setBannerData(null);
    setPhone('');
    setError(null);
  };

  if (!hasCheckedStorage) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        {isVerified && bannerData ? (
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
               <Button onClick={handleTryAnotherNumber} className="w-full" variant="outline">
                 Not your banner? Try another number.
               </Button>
             </CardContent>
           </>
        ) : (
            <>
            <CardHeader>
              <CardTitle>Download Your Banner</CardTitle>
              <CardDescription>
                To access your personalized banner, please enter the phone number associated with your shop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
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
                  {isLoading ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'View Banner'
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
