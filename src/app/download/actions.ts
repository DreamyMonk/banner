'use server';

import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export async function getBannerForPhone(phone: string): Promise<{ name: string; banner: string } | { error: string }> {
  try {
    // Find the most recent banner for the given phone number.
    const q = query(
        collection(db, 'sharedBanners'), 
        where('phone', '==', phone),
        orderBy('createdAt', 'desc'), // Keep ordering to get the latest one if duplicates somehow exist
        limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner found for this phone number, or a new link has been generated.' };
    }

    const docData = querySnapshot.docs[0].data();
    
    // The logic is now "latest link wins", so no timestamp check is needed here.
    // The cleanup is handled by a separate cron job.
    return {
        name: docData.shopName,
        banner: docData.bannerDataUri,
    };

  } catch (error) {
    console.error("Error fetching banner data:", error);
    return { error: 'An unexpected error occurred while retrieving the banner.' };
  }
}
