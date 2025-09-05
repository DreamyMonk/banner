'use server';

import { getFirestore, collection, getDocs, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export async function getPublishedBanners() {
  const snapshot = await getDocs(collection(db, 'publishedBanners'));
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || 'Untitled Banner',
      banner: data.baseBannerDataUri as string,
      createdAt: data.createdAt?.toDate().toISOString() || null,
    };
  });
}

export async function deletePublishedBanner(id: string) {
  try {
    await deleteDoc(doc(db, 'publishedBanners', id));
    const q = query(collection(db, 'sharedBanners'), where('baseBannerId', '==', id));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error deleting published banner:', error);
    return { success: false, error: errorMessage };
  }
}
