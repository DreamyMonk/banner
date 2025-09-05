'use server';

import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

type BannerData = {
  name: string;
  banner: string;
  bannerFileName: string;
};

type BannerResult = { banners: BannerData[] } | { error: string };

export async function getBannersForPhone(phone: string): Promise<BannerResult> {
  try {
    const q = query(collection(db, 'sharedBanners'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner is available for this phone number.' };
    }

    const banners: BannerData[] = [];
    querySnapshot.forEach(docSnap => {
      const docData = docSnap.data();

      if (docData.status === 'suspended') {
        return;
      }

      const createdAt = (docData.createdAt as Timestamp)?.toDate();
      const duration = docData.duration;
      if (createdAt && typeof duration === 'number') {
        const expirationDate = new Date(createdAt);
        expirationDate.setDate(expirationDate.getDate() + duration);
        if (new Date() > expirationDate) {
          return;
        }
      }

      banners.push({
        name: docData.shopName as string,
        banner: docData.bannerDataUri as string,
        bannerFileName: (docData.bannerFileName as string) || 'banner',
      });
    });

    if (banners.length === 0) {
      return { error: 'No banner is available for this phone number.' };
    }

    return { banners };
  } catch (error) {
    console.error('Error fetching banner data:', error);
    return { error: 'An unexpected error occurred while retrieving the banner.' };
  }
}
