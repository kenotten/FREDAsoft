import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toFraction = (val: number | undefined | null | '', includeQuote = true) => {
  if (val === undefined || val === null || val === '' || isNaN(Number(val))) return '';
  const num = Number(val);
  const whole = Math.floor(num);
  const fraction = num - whole;
  
  let fracStr = '';
  if (Math.abs(fraction - 0.25) < 0.001) fracStr = '1/4';
  else if (Math.abs(fraction - 0.5) < 0.001) fracStr = '1/2';
  else if (Math.abs(fraction - 0.75) < 0.001) fracStr = '3/4';
  else if (Math.abs(fraction - 0.125) < 0.001) fracStr = '1/8';
  else if (Math.abs(fraction - 0.375) < 0.001) fracStr = '3/8';
  else if (Math.abs(fraction - 0.625) < 0.001) fracStr = '5/8';
  else if (Math.abs(fraction - 0.875) < 0.001) fracStr = '7/8';
  
  const suffix = includeQuote ? '"' : '';
  if (whole === 0 && fracStr) return `${fracStr}${suffix}`;
  if (fracStr) return `${whole} ${fracStr}${suffix}`;
  return `${whole}${suffix}`;
};

export const fromFraction = (str: string): number | '' => {
  if (!str || str.trim() === '') return '';
  
  str = str.replace(/"/g, '').trim();
  if (!isNaN(Number(str))) return Number(str);

  const parts = str.split(/\s+/);
  
  if (parts.length === 1) {
    const part = parts[0];
    if (part.includes('/')) {
      const [num, den] = part.split('/').map(Number);
      return den ? num / den : Number(part);
    }
    return Number(part);
  } else if (parts.length === 2) {
    const whole = Number(parts[0]);
    const fractionPart = parts[1];
    if (fractionPart.includes('/')) {
      const [num, den] = fractionPart.split('/').map(Number);
      const fraction = den ? num / den : 0;
      return whole + fraction;
    }
    return whole + Number(fractionPart);
  }
  
  return Number(str) || '';
};

export function formatMeasurement(value: number | undefined | null, type: string | undefined | null, suffix?: string | null) {
  if (value === undefined || value === null) return '';
  if (type === 'Inches') {
    return toFraction(value, true);
  }
  if (suffix) return `${value}${suffix}`;
  
  const defaultSuffix = type === 'Percentage' ? '%' : 
                 type === 'Seconds' ? ' sec' : 
                 type === 'Degrees' ? '°' : 
                 type === 'Ratio' ? ':' : 
                 type === 'Feet' ? ' ft' :
                 type === 'Linear Feet' ? ' Lft' :
                 '';
  return `${value}${defaultSuffix}`;
}

export const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      if (['fldStandards', 'fldImages', 'images', 'standards'].includes(key)) {
        sanitized[key] = [];
      } else {
        sanitized[key] = null;
      }
    }
  });
  return sanitized;
};
