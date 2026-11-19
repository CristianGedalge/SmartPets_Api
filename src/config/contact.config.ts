import { registerAs } from '@nestjs/config';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactConfig = registerAs('contact', () => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'SmartPet';
  const recipientEmail =
    process.env.CONTACT_RECIPIENT_EMAIL?.trim() ||
    'cristian.gedalge2018@gmail.com';

  if (Boolean(apiKey) !== Boolean(senderEmail)) {
    throw new Error(
      'BREVO_API_KEY y BREVO_SENDER_EMAIL deben configurarse juntos.',
    );
  }
  if (senderEmail && !emailPattern.test(senderEmail)) {
    throw new Error('BREVO_SENDER_EMAIL tiene un formato inválido.');
  }
  if (!emailPattern.test(recipientEmail)) {
    throw new Error('CONTACT_RECIPIENT_EMAIL tiene un formato inválido.');
  }

  return {
    enabled: Boolean(apiKey && senderEmail),
    apiKey,
    senderEmail,
    senderName,
    recipientEmail,
  };
});
