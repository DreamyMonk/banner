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
import { generateAndSendBanners } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { BannerEditor } from '@/components/banner-editor';

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

const db = getFirestore(app);

export default function Home() {
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const unsubShops = onSnapshot(
      collection(db, 'shops'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setShops(
          snapshot.docs.map(
            doc => ({ ...doc.data(), id: doc.id } as Shop)
          )
        );
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
      }
    );

    return () => {
      unsubShops();
      unsubGroups();
    };
  }, []);

  const [bannerImage, setBannerImage] = useState<string | null>(
    'https://picsum.photos/1200/630'
  );
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
    'Hi {{shopName}},\n\nHere is your personalized banner!'
  );


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleBannerImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addElement = (type: 'logo' | 'text') => {
    const newElement: BannerElement = {
      id: crypto.randomUUID(),
      type,
      x: 50,
      y: 50,
      scale: type === 'logo' ? 20 : 30,
      rotation: 0,
      opacity: 100,
      ...(type === 'text' && {
        text: '{{shopName}}',
        color: '#ffffff',
        fontWeight: 700,
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

  const handleSend = async () => {
    if (!bannerImage) {
      toast({
        title: 'Missing Banner',
        description: 'Please upload a banner image before sending.',
        variant: 'destructive',
      });
      return;
    }

    const recipients =
      selectedGroups.length === 0
        ? shops
        : shops.filter(
            shop =>
              shop.groups &&
              shop.groups.some(groupId => selectedGroups.includes(groupId))
          );

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
      const shopsWithBanners = await Promise.all(
        recipients.map(async shop => {
          if (!shop.logo) {
            throw new Error(`Logo missing for shop ${shop.name}`);
          }
          const generatedBannerUri = await generateImageForShop(
            bannerImage,
            elements,
            shop
          );
          return { ...shop, bannerDataUri: generatedBannerUri };
        })
      );

      const results = await generateAndSendBanners(
        shopsWithBanners,
        emailSubject,
        emailBody
      );

      let successCount = 0;
      let errorCount = 0;

      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed for ${result.shopName}: ${result.error}`);
        }
      });

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
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error generating images:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ClientOnly>
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        shops={shops}
        groups={groups}
      />
      <main className="flex-1">
        <BannerEditor
          bannerImage={bannerImage}
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
          handleLayerDragEnd={handleLayerDragEnd}
          emailSubject={emailSubject}
          setEmailSubject={setEmailSubject}
          emailBody={emailBody}
          setEmailBody={setEmailBody}
        />
      </main>
    </div>
    </ClientOnly>
  );
}
