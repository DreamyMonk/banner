'use server';

import { personalizeBanner } from '@/ai/flows/personalize-banner-with-shop-data';
import type { PersonalizeBannerInput } from '@/ai/flows/personalize-banner-with-shop-data';
import type { Shop } from '@/lib/types';

// This is a placeholder for a real email sending function
async function sendEmail(
  to: string,
  from: string,
  subject: string,
  bannerDataUri: string
) {
  console.log(`Simulating email send to: ${to}`);
  // In a real app, you would use a service like Resend, SendGrid, etc.
  // For example: await resend.emails.send({ from, to, subject, html: `<img src="${bannerDataUri}" />` });
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return { success: true };
}

export async function generateAndSendBanners(
  shops: Shop[],
  bannerDataUri: string,
  ruleSet: string
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

        const input: PersonalizeBannerInput = {
          bannerDataUri,
          logoDataUri: shop.logo,
          shopName: shop.name,
          ruleSet,
        };

        const result = await personalizeBanner(input);

        await sendEmail(
          shop.email,
          'contact@bannerbee.app',
          'Your Personalized Banner is Here!',
          result.personalizedBannerDataUri
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
