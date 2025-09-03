'use server';

import { getFirestore, collection, query, where, getDocs, limit, orderBy, type Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export async function getBannerForPhone(phone: string): Promise<{ name: string; banner: string } | { error: string }> {
  try {
    const q = query(
        collection(db, 'sharedBanners'), 
        where('phone', '==', phone),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner found for this phone number, or the link has expired.' };
    }

    const docData = querySnapshot.docs[0].data();
    
    // Check for expiration server-side as well
    const createdAtTimestamp = docData.createdAt as Timestamp;
    const createdAtDate = createdAtTimestamp.toDate();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (createdAtDate < twentyFourHoursAgo) {
        return { error: 'This download link has expired.' };
    }

    return {
        name: docData.shopName,
        banner: docData.bannerDataUri,
    };

  } catch (error) {
    console.error("Error fetching banner data:", error);
    return { error: 'An unexpected error occurred while retrieving the banner.' };
  }
}
