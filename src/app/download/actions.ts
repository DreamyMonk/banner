'use server';

import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export async function verifyPhoneNumber(id: string, phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const q = query(
        collection(db, 'sharedBanners'), 
        where('accessId', '==', id),
        limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Invalid or expired link.' };
    }

    const docData = querySnapshot.docs[0].data();
    
    if (docData.phone === phone) {
      return { success: true };
    } else {
      return { success: false, error: 'Phone number does not match.' };
    }
  } catch (error) {
    console.error("Verification error:", error);
    return { success: false, error: 'An unexpected error occurred during verification.' };
  }
}

export async function getBannerData(id: string): Promise<{ name: string; banner: string } | null> {
    try {
        const q = query(
            collection(db, 'sharedBanners'), 
            where('accessId', '==', id),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const docData = querySnapshot.docs[0].data();
        return {
            name: docData.shopName,
            banner: docData.bannerDataUri,
        };

    } catch (error) {
        console.error("Error fetching banner data:", error);
        return null;
    }
}
