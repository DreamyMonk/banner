'use server';

import { getFirestore, collection, query, where, getDocs, doc, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

type BannerData = {
  name: string;
  shopName: string;
  bannerUrl: string;
  bannerFileName: string;
  createdAt: string | null; // Add this to sort by creation date
};

type BannerResult = { banners: BannerData[] } | { error: string };

export async function getBannersForPhone(phone: string): Promise<BannerResult> {
  try {
    // Query sharedBanners collection for the given phone number
    const q = query(collection(db, 'sharedBanners'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { error: 'No banner is available for this phone number.' };
    }

    const banners: BannerData[] = [];

    for (const docSnap of querySnapshot.docs) {
      const docData = docSnap.data() as Record<string, any>;

      if (docData.status === 'suspended') {
        continue;
      }

      let createdAtDate: Date | null = null;
      const createdAtRaw = docData.createdAt;
      if (createdAtRaw instanceof Timestamp) {
        createdAtDate = createdAtRaw.toDate();
      } else if (createdAtRaw instanceof Date) {
        createdAtDate = createdAtRaw;
      } else if (typeof createdAtRaw === 'number') {
        createdAtDate = new Date(createdAtRaw);
      }

      const duration = docData.duration;
      if (createdAtDate && typeof duration === 'number') {
        const expirationDate = new Date(createdAtDate);
        expirationDate.setDate(expirationDate.getDate() + duration);
        if (new Date() > expirationDate) {
          continue; // Skip expired banners
        }
      }

      // Log the download
      try {
        await addDoc(collection(db, 'bannerDownloads'), {
          phone: phone,
          bannerId: docSnap.id,
          shopName: docData.shopName,
          downloadedAt: new Date(),
        });
      } catch (error) {
        console.error('Error logging banner download:', error);
      }

      // NEW: Get the banner name from the publishedBanners collection
      let bannerName = 'Untitled Banner';
      if(docData.baseBannerId) {
          const bannerDocRef = doc(db, 'publishedBanners', docData.baseBannerId);
          const bannerDocSnap = await getDoc(bannerDocRef);
          if(bannerDocSnap.exists()) {
              bannerName = bannerDocSnap.data().name || 'Untitled Banner';
          }
      }

      const shopName = typeof docData.shopName === 'string' ? docData.shopName : '';
      const bannerUrl = typeof docData.bannerUrl === 'string' ? docData.bannerUrl : '';
      const bannerFileName = typeof docData.bannerFileName === 'string' && docData.bannerFileName.length > 0
        ? docData.bannerFileName
        : 'banner';

      if (!bannerUrl) continue;

      banners.push({
        name: bannerName,
        shopName,
        bannerUrl,
        bannerFileName,
        createdAt: createdAtDate ? createdAtDate.toISOString() : null
      });
    }

    if (banners.length === 0) {
      return { error: 'No currently active banners found for this number.' };
    }

    // Sort banners by creation date in descending order
    banners.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (a.createdAt) return -1; // a is not null, b is null, a goes first
        if (b.createdAt) return 1;  // b is not null, a is null, b goes first
        return 0; // both are null
    });

    return { banners };

  } catch (error) {
    console.error('Error fetching banner data:', error);
    return { error: 'An unexpected error occurred while retrieving banners.' };
  }
}
