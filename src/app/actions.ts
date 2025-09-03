'use server';

import type { Shop } from '@/lib/types';
import Mailjet from 'node-mailjet';

const db = getFirestore(app);
import { app } from '@/lib/firebase';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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
  attachments: Attachment[]
) {
  console.log(`Sending email via Mailjet to: ${to}`);
  const request = mailjet.post('send', { version: 'v3.1' }).request({
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
        Attachments: attachments,
      },
    ],
  });

  await request;
  return { success: true };
}

function generateEmailHTML(shopName: string, emailBody: string): string {
  const personalizedBody = emailBody
    .replace(/{{shopName}}/g, shopName)
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
            .banner-image {
                width: 100%;
                max-width: 600px;
                height: auto;
                margin-top: 20px;
                border-radius: 4px;
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
            <img src="cid:banner.png" alt="Personalized Banner" class="banner-image" />
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

        const emailHtml = generateEmailHTML(shop.name, emailBody);

        const bannerMimeType = shop.bannerDataUri.split(';')[0].split(':')[1];
        const bannerBase64 = shop.bannerDataUri.split(',')[1];
        const bannerAttachment: Attachment = {
          ContentType: bannerMimeType,
          Filename: 'banner.png',
          Base64Content: bannerBase64,
        };

        await sendEmail(
          shop.email,
          'banner@zedsu.com',
          emailSubject.replace('{{shopName}}', shop.name),
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

export async function addShop(shop: Omit<Shop, 'id'>) {
  await addDoc(collection(db, 'shops'), shop);
}

export async function updateShop(shop: Shop) {
  const { doc, updateDoc, getFirestore } = await import('firebase/firestore');
  const db = getFirestore(app);
  await updateDoc(doc(db, 'shops', shop.id), {
    name: shop.name,
    email: shop.email,
    logo: shop.logo,
    groups: shop.groups,
  });
}

export async function deleteShop(shopId: string) {
  const { doc, deleteDoc, getFirestore } = await import('firebase/firestore');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'shops', shopId));
}

export async function addGroup(groupName: string) {
  await addDoc(collection(db, 'groups'), { name: groupName });
}

export async function deleteGroup(groupId: string) {
  const { doc, deleteDoc, getFirestore } = await import('firebase/firestore');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'groups', groupId));
}
