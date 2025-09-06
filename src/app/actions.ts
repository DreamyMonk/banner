'use server';

import type { Shop } from '@/lib/types';
import Mailjet from 'node-mailjet';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { uploadToR2, deleteFromR2, getPublicUrl } from '@/lib/cloudflare-r2';

const db = getFirestore(app);
const BATCH_SIZE = 50;

interface Attachment {
  ContentType: string;
  Filename: string;
  Base64Content: string;
}

interface ShopWithBanner extends Shop {
  bannerDataUri: string;
  bannerFileName: string;
}

function generateEmailHTML(
  shop: Shop,
  emailBody: string
): string {
  const personalizedBody = emailBody
    .replace(/{{shopName}}/g, shop.name)
    .replace(/{{address}}/g, shop.address || '')
    .replace(/{{phone}}/g, shop.phone || '')
    .replace(/{{email}}/g, shop.email || '')
    .replace(/\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Personalized Banner</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .content {
                font-size: 16px;
                line-height: 1.5;
                color: #333333;
            }
            .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #888888;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                ${personalizedBody}
            </div>
            <p class="footer">Powered by Banners from Zedsu</p>
        </div>
    </body>
    </html>
  `;
}

async function processInBatches<T, R>(
  items: T[],
  processItem: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processItem));
    results.push(...batchResults);
    if (items.length > BATCH_SIZE) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Avoid hitting rate limits
    }
  }
  return results;
}

export async function sendBannersByEmail(
  shops: ShopWithBanner[],
  emailSubject: string,
  emailBody: string
) {
  const mailjet = new Mailjet({
    apiKey: '16d3a777234c9d5624e6948bddb8c93d',
    apiSecret: '674dcaf79502e10e9feae496ef4e68c5'
  });

  return processInBatches(shops, async shop => {
    try {
      if (!shop.bannerDataUri) {
        throw new Error(`Banner for ${shop.name} is missing.`);
      }
      if (!shop.email) {
        console.warn(`Email missing for shop ${shop.name}, skipping.`);
        return { success: false, shopName: shop.name, error: "Email address is missing." };
      }

      const personalizedSubject = emailSubject
        .replace(/{{shopName}}/g, shop.name)
        .replace(/{{address}}/g, shop.address || '')
        .replace(/{{phone}}/g, shop.phone || '')
        .replace(/{{email}}/g, shop.email || '');

      const emailHtml = generateEmailHTML(shop, emailBody);

      const bannerMimeType = shop.bannerDataUri.split(';')[0].split(':')[1];
      const bannerBase64 = shop.bannerDataUri.split(',')[1];
      const fileName = `${shop.bannerFileName}_${shop.name.replace(/ /g, '_')}.png`;
      const bannerAttachment: Attachment = {
        ContentType: bannerMimeType,
        Filename: fileName,
        Base64Content: bannerBase64,
      };
      
      const requestData = {
          Messages: [
          {
              From: {
              Email: 'banner@zedsu.com',
              Name: 'Banners from Zedsu',
              },
              To: [
              {
                  Email: shop.email,
              },
              ],
              Subject: personalizedSubject,
              HTMLPart: emailHtml,
              Attachments: [bannerAttachment],
          },
          ],
      };

      await mailjet.post('send', { version: 'v3.1' }).request(requestData);

      return { success: true, shopName: shop.name };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`Error sending email to ${shop.name}:`, error);
      return { success: false, shopName: shop.name, error: errorMessage };
    }
  });
}

export async function shareBannersByLink(
  baseBanner: string,
  shops: ShopWithBanner[],
  baseBannerName: string,
) {
  try {
    if (!baseBanner) throw new Error('Base banner data is missing.');
    const baseBannerBuffer = Buffer.from(baseBanner.split(',')[1], 'base64');
    const baseBannerFileName = `${baseBannerName.replace(/ /g, '_')}_${Date.now()}.png`;
    await uploadToR2(baseBannerBuffer, baseBannerFileName);
    const baseBannerUrl = getPublicUrl(baseBannerFileName);

    const baseBannerDoc = await addDoc(collection(db, 'publishedBanners'), {
      name: baseBannerName,
      bannerUrl: baseBannerUrl,
      bannerFileName: baseBannerFileName,
      createdAt: serverTimestamp(),
      status: 'published',
    });

    const baseBannerId = baseBannerDoc.id;

    return processInBatches(shops, async shop => {
      try {
        if (!shop.bannerDataUri) {
           throw new Error(`Banner data for ${shop.name} is missing.`);
        }
        if (!shop.phone) {
          console.warn(
            `Skipping link generation for ${shop.name} due to missing phone number.`
          );
          return {
            success: false,
            shopName: shop.name,
            error: `Phone number for ${shop.name} is missing.`,
          };
        }

        const bannerBuffer = Buffer.from(shop.bannerDataUri.split(',')[1], 'base64');
        const bannerFileName = `${shop.bannerFileName}_${shop.name.replace(/ /g, '_')}_${Date.now()}.png`;
        await uploadToR2(bannerBuffer, bannerFileName);
        const bannerUrl = getPublicUrl(bannerFileName);

        await addDoc(collection(db, 'sharedBanners'), {
          shopName: shop.name,
          phone: shop.phone,
          bannerUrl: bannerUrl,
          bannerFileName: bannerFileName,
          createdAt: serverTimestamp(),
          duration: shop.duration || null,
          status: shop.status,
          baseBannerId,
        });

        return { success: true, shopName: shop.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Error sharing link for ${shop.name}:`, error);
        return { success: false, shopName: shop.name, error: errorMessage };
      }
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in shareBannersByLink:', error);
    // Throw a more specific error to be caught by the client
    throw new Error(`Failed to share banners: ${errorMessage}`);
  }
}

export async function deleteSharedBanners(shops: Shop[]) {
  const phones = shops.map(s => s.phone).filter(Boolean) as string[];
  if (phones.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    let deletedCount = 0;
    for (let i = 0; i < phones.length; i += 10) { // Firestore 'in' query limit
        const phoneBatch = phones.slice(i, i + 10);
        const q = query(collection(db, 'sharedBanners'), where('phone', 'in', phoneBatch));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            const deletePromises: Promise<void>[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.bannerFileName) {
                    deletePromises.push(deleteFromR2(data.bannerFileName));
                }
                batch.delete(doc.ref);
            });
            
            await Promise.all(deletePromises);
            await batch.commit();
            deletedCount += querySnapshot.size;
        }
    }

    return { success: true, deletedCount };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error deleting shared banners:', error);
    return { success: false, error: errorMessage };
  }
}


export async function cleanupExpiredBanners() {
  // This function can be kept for future maintenance if needed, but is not
  // strictly necessary for the "latest link wins" logic.
  // For now, it will do nothing to avoid conflicts.
  console.log('Cleanup function is currently disabled.');
  return { success: true, deletedCount: 0 };
}
