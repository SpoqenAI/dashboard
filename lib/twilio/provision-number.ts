import { logger } from '../logger';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const BASE_URL = 'https://api.twilio.com/2010-04-01';

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio credentials are not set in environment variables');
}

function getAuthHeader() {
  const creds = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
  ).toString('base64');
  return `Basic ${creds}`;
}

export async function searchAvailableNumbers(areaCode?: string) {
  const params = new URLSearchParams({
    VoiceEnabled: 'true',
    SmsEnabled: 'true',
    Limit: '1',
  });
  if (areaCode) params.append('AreaCode', areaCode);
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to search available numbers: ${res.status} ${res.statusText}`
    );
    throw new Error('Failed to search available numbers');
  }
  const data = await res.json();
  return data.available_phone_numbers?.[0] || null;
}

export async function provisionPhoneNumber(
  phoneNumber: string,
  voiceUrl?: string
) {
  const params = new URLSearchParams({
    PhoneNumber: phoneNumber,
  });
  if (voiceUrl) params.append('VoiceUrl', voiceUrl);
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to provision phone number: ${res.status} ${res.statusText}`
    );
    throw new Error('Failed to provision phone number');
  }
  const data = await res.json();
  return data;
}

export async function deletePhoneNumber(incomingPhoneNumberSid: string) {
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${incomingPhoneNumberSid}.json`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to delete phone number: ${res.status} ${res.statusText}`
    );
    throw new Error('Failed to delete phone number');
  }
  return true;
}
