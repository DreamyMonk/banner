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
import { randomUUID } from 'crypto';

const db = getFirestore(app);

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_SECRET_KEY,
});

interface Attachment {
  ContentType: string;
  Filename: string;
  Base64Content: string;
}

interface ShopWithBanner extends Shop {
  bannerDataUri: string;
}

async function sendEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
  attachments?: Attachment[]
) {
  console.log(`Sending email via Mailjet to: ${to}`);
  const requestData = {
    Messages: [
      {
        From: {
          Email: from,
          Name: 'Banners from Zedsu',
        },
        To: [
          {
            Email: to,
          },
        ],
        Subject: subject,
        HTMLPart: html,
        ...(attachments && { Attachments: attachments }),
      },
    ],
  };

  const request = mailjet.post('send', { version: 'v3.1' }).request(requestData);

  await request;
  return { success: true };
}

function generateEmailHTML(
  shop: Shop,
  emailBody: string,
  options: { bannerCid?: string; downloadLink?: string } = {}
): string {
  const personalizedBody = emailBody
    .replace(/{{shopName}}/g, shop.name)
    .replace(/{{address}}/g, shop.address || '')
    .replace(/{{phone}}/g, shop.phone || '')
    .replace(/{{email}}/g, shop.email || '')
    .replace(/\n/g, '<br>');

  const downloadButton = options.downloadLink
    ? `<a href="${options.downloadLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Download Your Banner</a>`
    : '';

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
            ${downloadButton ? `<div style="text-align: center;">${downloadButton}</div>` : ''}
            <p class="footer">Powered by Banners from Zedsu</p>
        </div>
    </body>
    </html>
  `;
}

export async function generateAndSendBanners(
  shops: ShopWithBanner[],
  emailSubject: string,
  emailBody: string
) {
  const results = await Promise.all(
    shops.map(async shop => {
      try {
        if (!shop.bannerDataUri) {
          throw new Error(`Banner for ${shop.name} is missing.`);
        }

        const emailHtml = generateEmailHTML(shop, emailBody);

        const bannerMimeType = shop.bannerDataUri.split(';')[0].split(':')[1];
        const bannerBase64 = shop.bannerDataUri.split(',')[1];
        const bannerAttachment: Attachment = {
          ContentType: bannerMimeType,
          Filename: 'banner.png',
          Base64Content: bannerBase64,
        };

        const personalizedSubject = emailSubject
          .replace(/{{shopName}}/g, shop.name)
          .replace(/{{address}}/g, shop.address || '')
          .replace(/{{phone}}/g, shop.phone || '')
          .replace(/{{email}}/g, shop.email || '');

        await sendEmail(
          shop.email,
          'banner@zedsu.com',
          personalizedSubject,
          emailHtml,
          [bannerAttachment]
        );

        return { success: true, shopName: shop.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Error for ${shop.name}:`, error);
        return { success: false, shopName: shop.name, error: errorMessage };
      }
    })
  );

  return results;
}

export async function shareBannersByLink(shops: ShopWithBanner[]) {
  const results = await Promise.all(
    shops.map(async shop => {
      try {
        if (!shop.bannerDataUri || !shop.phone) {
          throw new Error(`Banner or phone number for ${shop.name} is missing.`);
        }
        
        const uniqueId = randomUUID();
        await addDoc(collection(db, 'sharedBanners'), {
            shopName: shop.name,
            phone: shop.phone,
            bannerDataUri: shop.bannerDataUri,
            createdAt: serverTimestamp(),
            accessId: uniqueId,
        });

        const downloadLink = `${process.env.NEXT_PUBLIC_BASE_URL}/download?id=${uniqueId}`;
        
        const emailBody = `Hi {{shopName}},\n\nYour personalized banner is ready! Click the link below to view and download it.\n\nFor security, you will be asked to verify your phone number.`;
        const emailSubject = `Your Banner for {{shopName}} is Ready`;

        const personalizedSubject = emailSubject.replace(/{{shopName}}/g, shop.name);
        const emailHtml = generateEmailHTML(shop, emailBody, { downloadLink });

        await sendEmail(shop.email, 'banner@zedsu.com', personalizedSubject, emailHtml);

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
