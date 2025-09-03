'use client';

import { useState, useMemo, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { sendBannersByEmail, shareBannersByLink, deleteSharedBanners } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import BannerEditor from '@/components/banner-editor';
import JSZip from 'jszip';
import type { Shop, Group, BannerElement } from '@/lib/types';
import {
  collection,
  onSnapshot,
  getFirestore,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { ClientOnly } from '@/components/client-only';
import { generateImageForShop } from '@/lib/image-generator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const db = getFirestore(app);

export default function EditorPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [bannerFileName, setBannerFileName] = useState<string | null>(null);

  useEffect(() => {
    const unsubShops = onSnapshot(
      collection(db, 'shops'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setShops(
          snapshot.docs.map(
            doc => ({ ...doc.data(), id: doc.id } as Shop)
          )
        );
      },
      error => {
        console.error("Firestore 'shops' subscription error: ", error);
        toast({
            title: 'Database Error',
            description: 'Could not load shops. Check Firestore permissions.',
            variant: 'destructive'
        });
      }
    );

    const unsubGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setGroups(
          snapshot.docs.map(
            doc => ({ ...doc.data(), id: doc.id } as Group)
          )
        );
      },
       error => {
        console.error("Firestore 'groups' subscription error: ", error);
        toast({
            title: 'Database Error',
            description: 'Could not load groups. Check Firestore permissions.',
            variant: 'destructive'
        });
      }
    );

    return () => {
      unsubShops();
      unsubGroups();
    };
  }, [toast]);

  const [bannerImage, setBannerImage] = useState<string | null>(
    'https://picsum.photos/1200/630'
  );
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [elements, setElements] = useState<BannerElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState(
    'Your Personalized Banner is Here!'
  );
  const [emailBody, setEmailBody] = useState(
    'Hi {{shopName}},\n\nHere is your personalized banner, attached.'
  );

  useEffect(() => {
    if (bannerImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        console.error("Failed to load image to calculate dimensions.");
        setImageDimensions(null);
      };
      img.src = bannerImage;
    } else {
      setImageDimensions(null);
    }
  }, [bannerImage]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleBannerImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFileName(file.name.replace(/\.[^/.]+$/, ''));
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBanner = () => {
    setBannerImage(null);
    setElements([]);
    setSelectedElementId(null);
    setBannerFileName(null);
  }

  const handleDeleteSharedBanners = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast({
        title: 'No Recipients Selected',
        description: 'Please select groups to delete their shared banners.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    toast({
      title: 'Deleting Banners...',
      description: `Requesting deletion for ${recipients.length} shops.`,
    });

    try {
      const result = await deleteSharedBanners(recipients);
      if (result.success) {
        toast({
          title: 'Deletion Successful',
          description: `${result.deletedCount} shared banners have been removed.`,
        });
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Deletion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error deleting shared banners:', error);
    } finally {
      setIsSending(false);
      setIsDeleteAlertOpen(false);
    }
  };


  const addElement = (type: 'logo' | 'text') => {
    const newElement: BannerElement = {
      id: crypto.randomUUID(),
      type,
      x: 50,
      y: 50,
      scale: 15,
      rotation: 0,
      opacity: 100,
      ...(type === 'text' && {
        text: '{{shopName}}',
        color: '#ffffff',
        fontWeight: 400,
        fontFamily: 'Roboto',
        letterSpacing: 0,
      }),
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, newProps: Partial<BannerElement>) => {
    setElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...newProps } : el))
    );
  };

  const removeElement = (id: string) => {
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const selectedElement = useMemo(
    () => elements.find(el => el.id === selectedElementId),
    [elements, selectedElementId]
  );

  function handleLayerDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setElements(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const getRecipients = () => {
    return selectedGroups.length === 0
      ? shops
      : shops.filter(
          shop =>
            shop.groups &&
            shop.groups.some(groupId => selectedGroups.includes(groupId))
        );
  };

  const generateBannersForRecipients = async (recipients: Shop[]) => {
    if (!bannerImage) {
      toast({
        title: 'Missing Banner',
        description: 'Please upload a banner image.',
        variant: 'destructive',
      });
      return null;
    }

    try {
        const generatedBanners = await Promise.all(
            recipients.map(async shop => {
                if (!shop.logo) {
                console.warn(`Logo missing for shop ${shop.name}, skipping banner generation.`);
                return null;
                }
                const generatedBannerUri = await generateImageForShop(
                bannerImage,
                elements,
                shop
                );
                return { ...shop, bannerDataUri: generatedBannerUri, bannerFileName: bannerFileName || 'banner' };
            })
        );
        return generatedBanners.filter(Boolean) as (Shop & { bannerDataUri: string; bannerFileName: string })[];
    } catch (error) {
        const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
        toast({
            title: 'Image Generation Failed',
            description: errorMessage,
            variant: 'destructive',
        });
        console.error('Error during image generation:', error);
        return null;
    }

  };

  const handleSend = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast({
        title: 'No Recipients',
        description:
          'Please select at least one group with shops or add shops.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    toast({
      title: 'Generating & Sending Banners...',
      description: `Processing ${recipients.length} shops. This may take a moment.`,
    });

    try {
      const shopsWithBanners = await generateBannersForRecipients(recipients);
      if (!shopsWithBanners || shopsWithBanners.length === 0) {
        toast({
            title: 'No Banners Generated',
            description: 'Could not generate any banners. Check if shops have logos.',
            variant: 'destructive'
        });
        setIsSending(false);
        return;
      }

      const results = await sendBannersByEmail(
        shopsWithBanners,
        emailSubject,
        emailBody
      );

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      toast({
        title: 'Sending Complete',
        description: `Sent ${successCount} banners successfully. ${
          errorCount > 0 ? `${errorCount} failed.` : ''
        }`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Sending Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error in handleSend:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleShare = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select recipients to share with.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    toast({
      title: 'Generating Links...',
      description: `Processing ${recipients.length} shops.`,
    });

    try {
      const shopsWithBanners = await generateBannersForRecipients(recipients);
      if (!shopsWithBanners || shopsWithBanners.length === 0) {
         toast({
            title: 'No Banners Generated',
            description: 'Could not generate banners for sharing. Check if shops have logos and phone numbers.',
            variant: 'destructive'
        });
        setIsSending(false);
        return;
      }

      const results = await shareBannersByLink(shopsWithBanners);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      toast({
        title: 'Link Generation Complete',
        description: `Created ${successCount} shareable links. ${
          errorCount > 0 ? `${errorCount} failed.` : ''
        }`,
        variant: errorCount > 0 ? 'destructive' : 'default',
        duration: 9000
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Sharing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error sharing links:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'No shops to generate banners for.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    toast({
      title: 'Generating Banners for Download...',
      description: `Processing ${recipients.length} shops.`,
    });

    try {
      const shopsWithBanners = await generateBannersForRecipients(recipients);
       if (!shopsWithBanners || shopsWithBanners.length === 0) {
         toast({
            title: 'No Banners Generated',
            description: 'Could not generate any banners for download. Check if shops have logos.',
            variant: 'destructive'
        });
        setIsSending(false);
        return;
      }

      const zip = new JSZip();
      shopsWithBanners.forEach(shop => {
        const base64Data = shop.bannerDataUri.split(',')[1];
        const fileName = `${shop.bannerFileName}_${shop.name.replace(/ /g, '_')}.png`;
        zip.file(fileName, base64Data, {
          base64: true,
        });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${bannerFileName || 'banners'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download Ready',
        description: 'Your zip file has been created.',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Download Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error generating zip:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ClientOnly>
        <Header 
          onClearBanner={clearBanner} 
          onDeleteBanner={() => setIsDeleteAlertOpen(true)} 
        />
      </ClientOnly>
      <main className="flex-1 min-h-0">
        <ClientOnly>
          <BannerEditor
            bannerImage={bannerImage}
            imageDimensions={imageDimensions}
            handleBannerImageUpload={handleBannerImageUpload}
            elements={elements}
            selectedElement={selectedElement}
            setSelectedElementId={setSelectedElementId}
            updateElement={updateElement}
            removeElement={removeElement}
            addElement={addElement}
            shops={shops}
            groups={groups}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
            isSending={isSending}
            handleSend={handleSend}
            handleDownload={handleDownload}
            handleShare={handleShare}
            handleLayerDragEnd={handleLayerDragEnd}
            emailSubject={emailSubject}
            setEmailSubject={setEmailSubject}
            emailBody={emailBody}
            setEmailBody={setEmailBody}
          />
        </ClientOnly>
      </main>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shared banners for all shops in the selected groups.
              This action cannot be undone and will prevent them from being downloaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSharedBanners}>
              Yes, delete banners
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}