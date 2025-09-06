'use server';

import { getFirestore, collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export type DownloadRecord = {
  phone: string;
  shopName: string;
  downloadedAt: string;
  bannerId: string;
};

export async function getBannerDownloads(): Promise<DownloadRecord[]> {
  try {
    const q = query(collection(db, 'bannerDownloads'));
    const querySnapshot = await getDocs(q);

    const downloads: DownloadRecord[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      downloads.push({
        phone: data.phone,
        shopName: data.shopName,
        downloadedAt: (data.downloadedAt as Timestamp).toDate().toISOString(),
        bannerId: data.bannerId,
      });
    });

    return downloads;
  } catch (error) {
    console.error('Error fetching banner downloads:', error);
    return [];
  }
}
