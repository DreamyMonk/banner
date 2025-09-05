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
      const docData = docSnap.data() as Record<string, any>;

      // skip suspended
      if (docData.status === 'suspended') {
        return;
      }

      // handle createdAt in multiple possible shapes (Timestamp, Date, number)
      let createdAtDate: Date | null = null;
      const createdAtRaw = docData.createdAt;
      if (createdAtRaw instanceof Timestamp) {
        createdAtDate = createdAtRaw.toDate();
      } else if (createdAtRaw instanceof Date) {
        createdAtDate = createdAtRaw;
      } else if (typeof createdAtRaw === 'number') {
        // unix ms or seconds? assume milliseconds; if seconds, this will result in a far past date
        createdAtDate = new Date(createdAtRaw);
      }

      const duration = docData.duration;
      if (createdAtDate && typeof duration === 'number') {
        const expirationDate = new Date(createdAtDate);
        expirationDate.setDate(expirationDate.getDate() + duration);
        if (new Date() > expirationDate) {
          // expired
          return;
        }
      }

      // map to BannerData (guard against missing fields)
      const name = typeof docData.shopName === 'string' ? docData.shopName : '';
      const banner = typeof docData.bannerDataUri === 'string' ? docData.bannerDataUri : '';
      const bannerFileName = typeof docData.bannerFileName === 'string' && docData.bannerFileName.length > 0
        ? docData.bannerFileName
        : 'banner';

      // if there's no banner data, skip
      if (!banner) return;

      banners.push({
        name,
        banner,
        bannerFileName,
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
