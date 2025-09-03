import type { BannerElement, Shop } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for images from other domains
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function generateImageForShop(
  baseBannerSrc: string,
  elements: BannerElement[],
  shop: Shop
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const baseImage = await loadImage(baseBannerSrc);
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;

  // Draw base banner
  ctx.drawImage(baseImage, 0, 0);

  // Draw elements from bottom to top
  for (const element of elements) {
    ctx.save();
    
    // Set transform
    const xPos = (element.x / 100) * canvas.width;
    const yPos = (element.y / 100) * canvas.height;
    ctx.translate(xPos, yPos);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.globalAlpha = element.opacity / 100;

    if (element.type === 'logo') {
        if(!shop.logo) continue;
        const logoImage = await loadImage(shop.logo);
        const width = (element.scale / 100) * canvas.width;
        const aspectRatio = logoImage.width / logoImage.height;
        const height = width / aspectRatio;
        ctx.drawImage(logoImage, -width / 2, -height / 2, width, height);

    } else if (element.type === 'text' && element.text) {
        const fontSize = (element.scale / 100) * (canvas.height / 15);
        ctx.font = `${element.fontWeight || 400} ${fontSize}px "${element.fontFamily || 'Roboto'}", sans-serif`;
        ctx.fillStyle = element.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (element.letterSpacing) {
            ctx.letterSpacing = `${element.letterSpacing}px`;
        }
        
        const text = element.text.replace('{{shopName}}', shop.name);
        ctx.fillText(text, 0, 0);
    }
    
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
