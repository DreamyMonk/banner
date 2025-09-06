'use server';

import { getFirestore, collection, getDocs, deleteDoc, doc, getDoc, query, where, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { deleteFromR2 } from '@/lib/cloudflare-r2';

const db = getFirestore(app);

export async function getPublishedBanners() {
  const q = query(collection(db, 'publishedBanners'), where('status', '==', 'published'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || 'Untitled Banner',
      bannerUrl: data.bannerUrl as string,
      createdAt: data.createdAt?.toDate().toISOString() || null,
    };
  });
}

export async function deletePublishedBanner(id: string) {
  try {
    const publishedBannerRef = doc(db, 'publishedBanners', id);
    const publishedBannerSnap = await getDoc(publishedBannerRef);

    if (!publishedBannerSnap.exists()) {
      throw new Error('Published banner not found');
    }

    const publishedBannerData = publishedBannerSnap.data();

    // Delete the base banner from R2
    if (publishedBannerData.bannerFileName) {
      await deleteFromR2(publishedBannerData.bannerFileName);
    }

    // Find and delete all shared banners associated with this published banner
    const q = query(collection(db, 'sharedBanners'), where('baseBannerId', '==', id));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    const deletePromises: Promise<void>[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.bannerFileName) {
        deletePromises.push(deleteFromR2(data.bannerFileName));
      }
      batch.delete(docSnap.ref);
    });

    await Promise.all(deletePromises);
    await batch.commit();

    // Finally, delete the published banner document itself
    await deleteDoc(publishedBannerRef);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error deleting published banner:', error);
    return { success: false, error: errorMessage };
  }
}

export async function deleteAllPublishedBanners() {
    try {
        // 1. Get all published banners
        const publishedBannersSnap = await getDocs(collection(db, 'publishedBanners'));
        if (publishedBannersSnap.empty) {
            return { success: true, deletedCount: 0 };
        }

        const batch = writeBatch(db);
        const r2DeletePromises: Promise<void>[] = [];

        // 2. For each published banner, prepare to delete it and its shared banners
        for (const pubDoc of publishedBannersSnap.docs) {
            const pubData = pubDoc.data();
            if (pubData.bannerFileName) {
                r2DeletePromises.push(deleteFromR2(pubData.bannerFileName));
            }

            // 3. Find associated shared banners
            const q = query(collection(db, 'sharedBanners'), where('baseBannerId', '==', pubDoc.id));
            const sharedBannersSnap = await getDocs(q);
            sharedBannersSnap.forEach(sharedDoc => {
                const sharedData = sharedDoc.data();
                if (sharedData.bannerFileName) {
                    r2DeletePromises.push(deleteFromR2(sharedData.bannerFileName));
                }
                batch.delete(sharedDoc.ref); // Delete shared banner doc
            });

            batch.delete(pubDoc.ref); // Delete published banner doc
        }

        // 4. Execute all deletions
        await Promise.all(r2DeletePromises); // Delete files from R2
        await batch.commit(); // Delete documents from Firestore

        return { success: true, deletedCount: publishedBannersSnap.size };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error deleting all published banners:', error);
        return { success: false, error: errorMessage };
    }
}
