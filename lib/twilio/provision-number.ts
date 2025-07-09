import { logger } from '../logger';

const BASE_URL = 'https://api.twilio.com/2010-04-01';

function getAuthHeader() {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not set in environment variables');
  }
  const creds = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
  ).toString('base64');
  return `Basic ${creds}`;
}

export async function searchAvailableNumbers(areaCode: string) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  if (!TWILIO_ACCOUNT_SID) {
    throw new Error('Twilio credentials are not set in environment variables');
  }
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&SmsEnabled=true&VoiceEnabled=true&Limit=5`;
  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to search available numbers: ${res.status} ${res.statusText}`,
      new Error(`Failed to search available numbers: ${res.status} ${res.statusText}`)
    );
    throw new Error('Failed to search available numbers');
  }
  return res.json();
}

export async function provisionPhoneNumber(phoneNumber: string) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  if (!TWILIO_ACCOUNT_SID) {
    throw new Error('Twilio credentials are not set in environment variables');
  }
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
    SmsEnabled: 'true',
    VoiceEnabled: 'true',
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to provision phone number: ${res.status} ${res.statusText}`,
      new Error(`Failed to provision phone number: ${res.status} ${res.statusText}`)
    );
    throw new Error('Failed to provision phone number');
  }
  return res.json();
}

export async function deletePhoneNumber(providerNumberId: string) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  if (!TWILIO_ACCOUNT_SID) {
    throw new Error('Twilio credentials are not set in environment variables');
  }
  const url = `${BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${providerNumberId}.json`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!res.ok) {
    logger.error(
      'TWILIO',
      `Failed to delete phone number: ${res.status} ${res.statusText}`,
      new Error(`Failed to delete phone number: ${res.status} ${res.statusText}`)
    );
    throw new Error('Failed to delete phone number');
  }
  return true;
}
