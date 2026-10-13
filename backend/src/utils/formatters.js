/**
 * Format numbers with Indian comma grouping.
 * @param {number|string} num 
 * @param {boolean} forceDecimals 
 * @returns {string}
 */
export function formatIndianNumber(num, forceDecimals = false) {
  if (num === null || num === undefined || num === '' || num === '-') return '-';
  const val = Number(num);
  if (isNaN(val)) return '-';
  if (val === 0) return '-';

  if (!forceDecimals && Number.isInteger(val)) {
    return val.toLocaleString('en-IN');
  }

  return val.toLocaleString('en-IN', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format dates into DD-MM-YYYY or readable string.
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatInvoiceDate(dateStr) {
  if (!dateStr) return '';
  // Check if DD-MM-YYYY already
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('T')[0].split('-');
    return `${d}-${m}-${y}`;
  }
  return dateStr;
}

/**
 * Convert numbers to Indian Rupees in words.
 * E.g., 59000 -> "Fifty Nine Thousand Rupees only"
 * @param {number|string} amount 
 * @returns {string}
 */
export function numberToWords(amount) {
  if (!amount || isNaN(amount) || Number(amount) === 0) return 'Zero Rupees only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? ' ' + ones[u] : '');
  }

  function convertThreeDigits(n) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (h > 0) {
      res += ones[h] + ' Hundred';
      if (rem > 0) res += ' ';
    }
    if (rem > 0) {
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const [rupeesPart, paisePart] = Number(amount).toFixed(2).split('.');
  let num = parseInt(rupeesPart, 10);

  if (num === 0 && parseInt(paisePart, 10) === 0) return 'Zero Rupees only';

  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (crore > 0) {
    words += convertTwoDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertThreeDigits(remainder) + ' ';
  }

  words = words.trim();
  if (words.length > 0) {
    words += ' Rupees';
  }

  const paise = parseInt(paisePart, 10);
  if (paise > 0) {
    words += (words.length > 0 ? ' and ' : '') + convertTwoDigits(paise) + ' Paise';
  }

  return words + ' only';
}

/**
 * Formats current date/time into digital signature timestamp format:
 * "YYYY.MM.DD HH:mm:ss\n+05'30'"
 * @param {Date} [dateObj=new Date()]
 * @returns {string}
 */
export function getDigitalSignatureTimestamp(dateObj = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());

  // Timezone offset in +05'30' format
  const offsetMinutes = -dateObj.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetH = pad(Math.floor(absOffset / 60));
  const offsetM = pad(absOffset % 60);
  const tzStr = `${sign}${offsetH}'${offsetM}'`;

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}\n${tzStr}`;
}

