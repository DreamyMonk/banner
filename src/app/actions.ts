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
   if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
        throw new Error('Mailjet API keys are not configured in environment variables.');
    }
    
    const mailjet = new Mailjet({
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_SECRET_KEY,
    });

  const results = await Promise.all(
    shops.map(async shop => {
      try {
        if (!shop.bannerDataUri) {
          throw new Error(`Banner for ${shop.name} is missing.`);
        }

        const personalizedSubject = emailSubject
          .replace(/{{shopName}}/g, shop.name)
          .replace(/{{address}}/g, shop.address || '')
          .replace(/{{phone}}/g, shop.phone || '')
          .replace(/{{email}}/g, shop.email || '');

        const emailHtml = generateEmailHTML(shop, emailBody);

        const bannerMimeType = shop.bannerDataUri.split(';')[0].split(':')[1];
        const bannerBase64 = shop.bannerDataUri.split(',')[1];
        const bannerAttachment: Attachment = {
          ContentType: bannerMimeType,
          Filename: 'banner.png',
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
            throw new Error(`Banner or phone number for ${shop.name} is missing.`);
            }
            
            await addDoc(collection(db, 'sharedBanners'), {
                shopName: shop.name,
                phone: shop.phone,
                bannerDataUri: shop.bannerDataUri,
                createdAt: serverTimestamp(),
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
      // This will catch top-level errors, like the permission denied error during the delete query
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error in shareBannersByLink:', error);
      // Re-throw the error to be caught by the calling function in the component
      throw new Error(errorMessage);
  }
}


export async function addShop(shop: Omit<Shop, 'id'>) {
  await addDoc(collection(db, 'shops'), shop);
}

export async function updateShop(shop: Shop) {
  await updateDoc(doc(db, 'shops', shop.id), {
    name: shop.name,
    email: shop.email,
    logo: shop.logo,
    groups: shop.groups,
    address: shop.address,
    phone: shop.phone,
  });
}

export async function deleteShop(shopId: string) {
  await deleteDoc(doc(db, 'shops', shopId));
}

export async function addGroup(groupName: string) {
  await addDoc(collection(db, 'groups'), { name: groupName });
}

export async function deleteGroup(groupId: string) {
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function cleanupExpiredBanners() {
  console.log('Running cleanup for expired banners...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const q = query(collection(db, "sharedBanners"), where("createdAt", "<", twentyFourHoursAgo));
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    console.log("No expired banners to delete.");
    return { success: true, deletedCount: 0 };
  }

  const batch = writeBatch(db);
  querySnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  console.log(`Deleted ${querySnapshot.size} expired banners.`);
  return { success: true, deletedCount: querySnapshot.size };
}
