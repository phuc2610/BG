const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(number: number, showZeroHundred: boolean): string {
  const hundred = Math.floor(number / 100);
  const ten = Math.floor((number % 100) / 10);
  const unit = number % 10;
  let result = '';

  if (hundred > 0 || showZeroHundred) {
    result += `${defaultNumbers[hundred]} trăm `;
  }

  if (ten > 1) {
    result += `${defaultNumbers[ten]} mươi `;
    if (unit === 1) result += 'mốt';
    else if (unit === 5) result += 'lăm';
    else if (unit > 0) result += defaultNumbers[unit];
  } else if (ten === 1) {
    result += 'mười ';
    if (unit === 1) result += 'một';
    else if (unit === 5) result += 'lăm';
    else if (unit > 0) result += defaultNumbers[unit];
  } else {
    if (showZeroHundred && unit > 0) {
      result += 'lẻ ';
    }
    if (unit > 0) {
      result += defaultNumbers[unit];
    }
  }

  return result.trim();
}

/**
 * Converts a number to Vietnamese text.
 * Example: 17260000 -> "Mười bảy triệu hai trăm sáu mươi nghìn đồng"
 */
export function numberToWordsVietnamese(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';
  if (amount < 0) return `Âm ${numberToWordsVietnamese(Math.abs(amount)).toLowerCase()}`;

  let num = Math.floor(amount);
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const parts: string[] = [];
  let unitIdx = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const showZeroHundred = num > 999;
      const text = readThreeDigits(chunk, showZeroHundred && (num >= 1000));
      const unitName = units[unitIdx];
      parts.unshift(`${text} ${unitName}`.trim());
    }
    num = Math.floor(num / 1000);
    unitIdx++;
  }

  let result = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!result) return 'Không đồng';

  // Capitalize first letter and append "đồng"
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
  return result;
}
