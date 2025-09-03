'use server';

import { app } from '@/lib/firebase';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import type { BannerElement, Shop } from '@/lib/types';

const db = getFirestore(app);

// This function adds an email document to the 'mail' collection
// which is then picked up by the 'Trigger Email' Firebase Extension to send the email.
async function sendEmail(
  to: string,
  from: string,
  subject: string,
  html: string
) {
  console.log(`Adding email to Firestore queue for: ${to}`);
  await addDoc(collection(db, 'mail'), {
    to: [to],
    from: from,
    message: {
      subject: subject,
      html: html,
    },
  });
  return { success: true };
}

function generateBannerHTML(shop: Shop, bannerImage: string, elements: BannerElement[]): string {
    const elementHTML = elements.map(element => {
      const style: React.CSSProperties = {
          position: 'absolute',
          left: `${element.x}%`,
          top: `${element.y}%`,
          transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
          opacity: element.opacity / 100,
          aspectRatio: element.type === 'logo' ? '1 / 1' : undefined,
      };

      if (element.type === 'logo') {
        return `<div style="left:${style.left};top:${style.top};transform:${style.transform};opacity:${style.opacity};position:absolute;width:${element.scale}%;"><img src="${shop.logo}" alt="Shop Logo" style="width:100%;height:auto;object-fit:contain;" /></div>`
      }

      if (element.type === 'text') {
        const fontSize = `calc(${element.scale} / 100 * 4vw + 8px)`;
        return `<span style="left:${style.left};top:${style.top};transform:${style.transform};opacity:${style.opacity};position:absolute;color:${element.color};font-weight:${element.fontWeight};font-size:${fontSize};font-family:Belleza, sans-serif;white-space:nowrap;text-shadow:1px 1px 3px rgba(0,0,0,0.5);">${element.text?.replace('{{shopName}}', shop.name)}</span>`
      }
      return '';
    }).join('');

    return `
      <div style="position: relative; width: 1200px; height: 630px; overflow: hidden;">
        <img src="${bannerImage}" alt="Banner" style="width: 100%; height: 100%; object-fit: cover;" />
        ${elementHTML}
      </div>
    `;
}

function generateEmailHTML(shop: Shop, bannerHTML: string, emailBody: string): string {
    const personalizedBody = emailBody
      .replace(/{{shopName}}/g, shop.name)
      .replace(/\n/g, '<br>');

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <p>${personalizedBody}</p>
        <br>
        ${bannerHTML}
        <br>
        <p style="font-size: 12px; color: #888;">Powered by BannerBee</p>
      </div>
    `;
}


export async function generateAndSendBanners(
  shops: Shop[],
  bannerDataUri: string,
  elements: BannerElement[],
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

        const bannerHtml = generateBannerHTML(shop, bannerDataUri, elements);
        const emailHtml = generateEmailHTML(shop, bannerHtml, emailBody);

        await sendEmail(
          shop.email,
          'contact@bannerbee.app',
          'Your Personalized Banner is Here!',
          emailHtml
        );

        return { success: true, shopName: shop.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
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
