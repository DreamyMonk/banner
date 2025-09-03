import type { BannerElement } from './types';

export function generateRuleSet(elements: BannerElement[]): string {
  if (elements.length === 0) {
    return 'No personalization rules defined. Please add and position a logo or text element.';
  }

  const rules = elements.map((el, index) => {
    let rule = `Rule for element ${index + 1}:\n`;
    if (el.type === 'logo') {
      rule += `- This element is the shop's logo.\n`;
    } else {
      rule += `- This element is a text block containing: "${el.text}". Use the shop's actual name where "{{shopName}}" is present.\n`;
      rule += `- The text color should be ${el.color} and the font weight should be ${el.fontWeight}.\n`;
    }

    rule += `- Position the element with its center at ${el.x}% from the left and ${el.y}% from the top of the banner.\n`;
    rule += `- Scale the element to be ${el.scale}% of the banner's width (for logos) or height (for text).\n`;
    rule += `- Apply a rotation of ${el.rotation} degrees.\n`;
    rule += `- Set the opacity to ${el.opacity}%.\n`;

    return rule;
  });

  return `Personalize the banner according to the following rules, processed in order:\n\n${rules.join('\n')}`;
}
