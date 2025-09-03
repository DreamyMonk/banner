'use server';

import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export async function getBannerForPhone(phone: string): Promise<{ name: string; banner: string } | { error: string }> {
  try {
    // Simple lookup: Find a banner for the given phone number.
    // The "latest link wins" logic is handled in the `shareBannersByLink` action,
    // so we don't need complex queries here.
    const q = query(
        collection(db, 'sharedBanners'), 
        where('phone', '==', phone),
        limit(1) // In theory, there should only ever be one. This is a safeguard.
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner found for this phone number, or a newer link has been generated.' };
    }

    const docData = querySnapshot.docs[0].data();
    
    return {
        name: docData.shopName,
        banner: docData.bannerDataUri,
    };

  } catch (error) {
    console.error("Error fetching banner data:", error);
    return { error: 'An unexpected error occurred while retrieving the banner.' };
  }
}
