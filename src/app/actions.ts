'use server';

import type { Shop } from '@/lib/types';
import Mailjet from 'node-mailjet';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

const db = getFirestore(app);

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

export async function sendBannersByEmail(
  shops: ShopWithBanner[],
  emailSubject: string,
  emailBody: string
) {
   const mailjet = new Mailjet({
        apiKey: '16d3a777234c9d5624e6948bddb8c93d',
        apiSecret: '674dcaf79502e10e9feae496ef4e68c5'
    });

  const results = await Promise.all(
    shops.map(async shop => {
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
    })
  );

  return results;
}

export async function shareBannersByLink(shops: ShopWithBanner[]) {
  try {
      // First, delete any existing banners for the same phone numbers
    const phones = shops.map(s => s.phone).filter(Boolean);
    if (phones.length > 0) {
        const q = query(collection(db, "sharedBanners"), where("phone", "in", phones));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Deleted ${querySnapshot.size} existing banners for updated shops.`);
        }
    }

    const results = await Promise.all(
        shops.map(async shop => {
        try {
            if (!shop.bannerDataUri || !shop.phone) {
              console.warn(`Skipping link generation for ${shop.name} due to missing banner or phone.`);
              return { success: false, shopName: shop.name, error: `Banner or phone number for ${shop.name} is missing.` };
            }
            
            // Add the new banner without a timestamp.
            await addDoc(collection(db, 'sharedBanners'), {
                shopName: shop.name,
                phone: shop.phone,
                bannerDataUri: shop.bannerDataUri,
                bannerFileName: shop.bannerFileName,
            });

            return { success: true, shopName: shop.name };
        } catch (error) {
            const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
            console.error(`Error sharing link for ${shop.name}:`, error);
            return { success: false, shopName: shop.name, error: errorMessage };
        }
        })
    );
    return results;
  } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error in shareBannersByLink:', error);
      throw new Error(errorMessage);
  }
}

export async function deleteSharedBanners(shops: Shop[]) {
  const phones = shops.map(s => s.phone).filter(Boolean) as string[];
  if (phones.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const q = query(collection(db, 'sharedBanners'), where('phone', 'in', phones));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: true, deletedCount: 0 };
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { success: true, deletedCount: querySnapshot.size };
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
