'use server';

import type { BannerElement, Shop } from '@/lib/types';
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

function generateBannerHTML(shop: Shop, elements: BannerElement[]): string {
  const elementHTML = elements
    .map(element => {
      const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
        opacity: element.opacity / 100,
        aspectRatio: element.type === 'logo' ? '1 / 1' : undefined,
      };

      if (element.type === 'logo') {
        return `<div style="left:${style.left};top:${style.top};transform:${style.transform};opacity:${style.opacity};position:absolute;width:${element.scale}%;"><img src="${shop.logo}" alt="Shop Logo" style="width:100%;height:auto;object-fit:contain;" /></div>`;
      }

      if (element.type === 'text') {
        const fontSize = `calc(${element.scale} / 100 * 4vw + 8px)`;
        return `<span style="left:${style.left};top:${style.top};transform:${style.transform};opacity:${style.opacity};position:absolute;color:${element.color};font-weight:${element.fontWeight};font-size:${fontSize};font-family:Belleza, sans-serif;white-space:nowrap;text-shadow:1px 1px 3px rgba(0,0,0,0.5);">${element.text?.replace('{{shopName}}', shop.name)}</span>`;
      }
      return '';
    })
    .join('');

  return `
      <div style="position: relative; width: 1200px; height: 630px; overflow: hidden;">
        <img src="cid:banner.png" alt="Banner" style="width: 100%; height: 100%; object-fit: cover;" />
        ${elementHTML}
      </div>
    `;
}

function generateEmailHTML(
  shop: Shop,
  bannerHTML: string,
  emailBody: string
): string {
  const personalizedBody = emailBody
    .replace(/{{shopName}}/g, shop.name)
    .replace(/\n/g, '<br>');

  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <p>${personalizedBody}</p>
        <br>
        ${bannerHTML}
        <br>
        <p style="font-size: 12px; color: #888;">Powered by Banners from Zedsu</p>
      </div>
    `;
}

export async function generateAndSendBanners(
  shops: Shop[],
  bannerDataUri: string,
  elements: BannerElement[],
  emailSubject: string,
  emailBody: string
) {
  const results = await Promise.all(
    shops.map(async shop => {
      try {
        if (!bannerDataUri) {
          throw new Error('Banner image is missing.');
        }
        if (!shop.logo) {
          throw new Error(`Logo for ${shop.name} is missing.`);
        }
        
        const bannerHtml = generateBannerHTML(shop, elements);
        const emailHtml = generateEmailHTML(shop, bannerHtml, emailBody);

        const bannerMimeType = bannerDataUri.split(';')[0].split(':')[1];
        const bannerBase64 = bannerDataUri.split(',')[1];
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
        console.error(`Mailjet error for ${shop.name}:`, error);
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
