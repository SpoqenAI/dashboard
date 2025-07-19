import { logger } from '@/lib/logger';

/**
 * Supported currency codes for amount conversion
 */
const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'KRW',
  'CAD',
  'AUD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'BGN',
  'RON',
  'HRK',
  'RUB',
  'TRY',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'UYU',
  'INR',
  'THB',
  'MYR',
  'SGD',
  'IDR',
  'PHP',
  'VND',
  'ZAR',
  'ILS',
  'AED',
  'SAR',
  'QAR',
  'KWD',
  'BHD',
  'OMR',
  'JOD',
  'LBP',
  'EGP',
  'NGN',
  'GHS',
  'KES',
  'UGX',
  'TZS',
  'ZMW',
  'MWK',
  'BWP',
  'NAD',
  'SZL',
  'LSL',
  'MUR',
  'SCR',
  'MVR',
  'BIF',
  'DJF',
  'KMF',
  'RWF',
  'SOS',
  'TJS',
  'UZS',
  'KGS',
  'TMM',
  'MNT',
  'LAK',
  'KHR',
  'MMK',
  'BDT',
  'NPR',
  'PKR',
  'LKR',
  'MVR',
  'BTN',
  'AFN',
  'IRR',
  'IQD',
  'SYP',
  'YER',
  'KZT',
  'AZN',
  'GEL',
  'AMD',
  'MDL',
  'ALL',
  'MKD',
  'RSD',
  'MNE',
  'BIH',
  'XCD',
  'BBD',
  'JMD',
  'TTD',
  'GYD',
  'SRD',
  'BZD',
  'HNL',
  'GTQ',
  'SVC',
  'NIO',
  'CRC',
  'PAB',
  'PYG',
  'BOB',
  'ECU',
  'VEF',
  'DOP',
  'HTG',
  'CUP',
  'XOF',
  'XAF',
  'XPF',
  'GMD',
  'GNF',
  'LRD',
  'SLL',
  'SLE',
  'TND',
  'DZD',
  'MAD',
  'LYD',
  'SDG',
  'SSP',
  'ETB',
  'SOS',
  'DJF',
  'ERI',
  'GNF',
  'MLF',
  'XOF',
  'XAF',
  'XPF',
  'GMD',
  'GNF',
  'LRD',
  'SLL',
  'SLE',
  'TND',
  'DZD',
  'MAD',
  'LYD',
  'SDG',
  'SSP',
  'ETB',
  'SOS',
  'DJF',
  'ERI',
] as const;

/**
 * Currencies that use whole units instead of cents (no division by 100)
 */
const ZERO_DECIMAL_CURRENCIES = [
  'JPY',
  'KRW',
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
] as const;

/**
 * Converts an amount from its lowest unit (e.g., cents) to the standard unit (e.g., dollars)
 *
 * @description This function handles currency conversion from the smallest unit to the standard unit.
 * For most currencies (like USD, EUR), amounts are stored in cents and need to be divided by 100.
 * For zero-decimal currencies (like JPY, KRW), amounts are already in the standard unit.
 *
 * @param amount - The amount in the lowest unit as a string (e.g., "1500" for $15.00 USD)
 * @param currency - The three-letter ISO currency code (e.g., "USD", "EUR", "JPY")
 *
 * @returns The converted amount as a number in the standard unit
 *
 * @throws {Error} If amount is not a valid numeric string
 * @throws {Error} If currency is not a supported three-letter ISO currency code
 * @throws {Error} If the converted amount would be invalid (NaN, Infinity, etc.)
 *
 * @example
 * ```typescript
 * convertAmountFromLowestUnit("1500", "USD") // Returns 15.00
 * convertAmountFromLowestUnit("1000", "JPY") // Returns 1000 (no division)
 * convertAmountFromLowestUnit("2500", "EUR") // Returns 25.00
 * ```
 */
export function convertAmountFromLowestUnit(
  amount: string,
  currency: string
): number {
  // Validate amount parameter
  if (!amount || typeof amount !== 'string') {
    const error = new Error('Amount must be a non-empty string');
    logger.error('PARSE_MONEY', 'Invalid amount parameter', error, {
      amount,
      amountType: typeof amount,
      currency,
    });
    throw error;
  }

  if (amount.trim() === '') {
    const error = new Error('Amount cannot be an empty string');
    logger.error('PARSE_MONEY', 'Empty amount string', error, {
      amount,
      currency,
    });
    throw error;
  }

  // Validate that amount is a valid numeric string
  const numericRegex = /^-?\d+(\.\d+)?$/;
  if (!numericRegex.test(amount)) {
    const error = new Error(
      `Invalid amount format: "${amount}". Amount must be a valid numeric string.`
    );
    logger.error('PARSE_MONEY', 'Invalid amount format', error, {
      amount,
      currency,
    });
    throw error;
  }

  // Validate currency parameter
  if (!currency || typeof currency !== 'string') {
    const error = new Error('Currency must be a non-empty string');
    logger.error('PARSE_MONEY', 'Invalid currency parameter', error, {
      amount,
      currency,
      currencyType: typeof currency,
    });
    throw error;
  }

  if (currency.trim() === '') {
    const error = new Error('Currency cannot be an empty string');
    logger.error('PARSE_MONEY', 'Empty currency string', error, {
      amount,
      currency,
    });
    throw error;
  }

  const normalizedCurrency = currency.toUpperCase().trim();

  if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency as any)) {
    const error = new Error(
      `Unsupported currency: "${currency}". Supported currencies: ${SUPPORTED_CURRENCIES.slice(0, 10).join(', ')}...`
    );
    logger.error('PARSE_MONEY', 'Unsupported currency', error, {
      amount,
      currency: normalizedCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
    });
    throw error;
  }

  // Parse the amount
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount)) {
    const error = new Error(`Failed to parse amount: "${amount}"`);
    logger.error('PARSE_MONEY', 'Amount parsing failed', error, {
      amount,
      currency: normalizedCurrency,
    });
    throw error;
  }

  // Convert based on currency type
  let convertedAmount: number;

  if (ZERO_DECIMAL_CURRENCIES.includes(normalizedCurrency as any)) {
    // Zero-decimal currencies (JPY, KRW, etc.) - no division needed
    convertedAmount = parsedAmount;
  } else {
    // Standard currencies (USD, EUR, etc.) - divide by 100
    convertedAmount = parsedAmount / 100;
  }

  // Validate the result
  if (isNaN(convertedAmount) || !isFinite(convertedAmount)) {
    const error = new Error(`Invalid conversion result: ${convertedAmount}`);
    logger.error('PARSE_MONEY', 'Invalid conversion result', error, {
      amount,
      currency: normalizedCurrency,
      parsedAmount,
      convertedAmount,
    });
    throw error;
  }

  logger.debug('PARSE_MONEY', 'Amount converted successfully', {
    originalAmount: amount,
    currency: normalizedCurrency,
    convertedAmount,
    isZeroDecimal: ZERO_DECIMAL_CURRENCIES.includes(normalizedCurrency as any),
  });

  return convertedAmount;
}

export function parseMoney(amount: string = '0', currency: string = 'USD') {
  const parsedAmount = convertAmountFromLowestUnit(amount, currency);
  return formatMoney(parsedAmount, currency);
}

export function formatMoney(amount: number = 0, currency: string = 'USD') {
  const language =
    typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  return new Intl.NumberFormat(language ?? 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
