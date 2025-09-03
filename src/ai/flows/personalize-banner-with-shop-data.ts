'use server';

/**
 * @fileOverview Personalizes a banner with shop-specific data using GenAI.
 *
 * - personalizeBanner - A function that personalizes the banner with shop-specific data.
 * - PersonalizeBannerInput - The input type for the personalizeBanner function.
 * - PersonalizeBannerOutput - The return type for the personalizeBanner function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeBannerInputSchema = z.object({
  bannerDataUri: z
    .string()
    .describe(
      "A banner image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  logoDataUri: z
    .string()
    .describe(
      "A shop logo image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  shopName: z.string().describe('The name of the shop.'),
  ruleSet: z
    .string()
    .describe(
      'A rule set to guide the personalization choices, described in natural language.'
    ),
});
export type PersonalizeBannerInput = z.infer<typeof PersonalizeBannerInputSchema>;

const PersonalizeBannerOutputSchema = z.object({
  personalizedBannerDataUri: z
    .string()
    .describe(
      "The personalized banner image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type PersonalizeBannerOutput = z.infer<typeof PersonalizeBannerOutputSchema>;

export async function personalizeBanner(input: PersonalizeBannerInput): Promise<PersonalizeBannerOutput> {
  return personalizeBannerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeBannerPrompt',
  input: {schema: PersonalizeBannerInputSchema},
  output: {schema: PersonalizeBannerOutputSchema},
  prompt: `You are an expert banner designer specializing in personalizing banners for local shops.

You will use the provided banner, shop logo, and shop name to create a personalized banner.
You will adhere to the following rule set when personalizing the banner:
{{{ruleSet}}}

Output the personalized banner as a data URI.

Base Banner: {{media url=bannerDataUri}}
Shop Logo: {{media url=logoDataUri}}
Shop Name: {{{shopName}}}`,
});

const personalizeBannerFlow = ai.defineFlow(
  {
    name: 'personalizeBannerFlow',
    inputSchema: PersonalizeBannerInputSchema,
    outputSchema: PersonalizeBannerOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.bannerDataUri}},
        {media: {url: input.logoDataUri}},
        {text: `Personalize this banner for ${input.shopName} according to the following rules: ${input.ruleSet}`},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });
    return { personalizedBannerDataUri: output!.media!.url };
  }
);
