'use server';

import { getFirestore, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

type BannerResult = { 
  name: string; 
  banner: string; 
  bannerFileName: string; 
} | { error: string };


export async function getBannerForPhone(phone: string): Promise<BannerResult> {
  try {
    const q = query(
        collection(db, 'sharedBanners'), 
        where('phone', '==', phone),
        limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner is available for this phone number.' };
    }

    const docData = querySnapshot.docs[0].data();
    
    // Check for suspension
    if (docData.status === 'suspended') {
        return { error: 'Account Suspended. Please contact support.' };
    }

    // Check for expiration
    const createdAt = (docData.createdAt as Timestamp)?.toDate();
    const duration = docData.duration; // in days

    if (createdAt && typeof duration === 'number') {
        const expirationDate = new Date(createdAt);
        expirationDate.setDate(expirationDate.getDate() + duration);
        if (new Date() > expirationDate) {
            return { error: 'Plan Expired. Contact Support.' };
        }
    }

    return {
        name: docData.shopName,
        banner: docData.bannerDataUri,
        bannerFileName: docData.bannerFileName || 'banner',
    };

  } catch (error) {
    console.error("Error fetching banner data:", error);
    return { error: 'An unexpected error occurred while retrieving the banner.' };
  }
}
