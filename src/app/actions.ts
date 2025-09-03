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

function generateEmailHTML(
  shopName: string,
  emailBody: string
): string {
  const personalizedBody = emailBody
    .replace(/{{shopName}}/g, shopName)
    .replace(/\n/g, '<br>');

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <p>${personalizedBody}</p>
        <br>
        <img src="cid:banner.png" alt="Personalized Banner" style="width: 100%; max-width: 600px; height: auto;" />
        <br>
        <p style="font-size: 12px; color: #888;">Powered by Banners from Zedsu</p>
      </div>
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
