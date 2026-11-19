import { registerAs } from '@nestjs/config';

export const firebaseConfig = registerAs('firebase', () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const configured = [projectId, clientEmail, rawPrivateKey].filter(Boolean);

  if (configured.length === 0) {
    return {
      enabled: false as const,
      projectId: undefined,
      clientEmail: undefined,
      privateKey: undefined,
    };
  }
  if (configured.length !== 3) {
    throw new Error(
      'Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY juntas.',
    );
  }
  if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId!)) {
    throw new Error('FIREBASE_PROJECT_ID tiene un formato inválido.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail!)) {
    throw new Error('FIREBASE_CLIENT_EMAIL tiene un formato inválido.');
  }
  const privateKey = rawPrivateKey!.replace(/\\n/g, '\n').trim();
  if (
    !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
    !privateKey.includes('-----END PRIVATE KEY-----')
  ) {
    throw new Error('FIREBASE_PRIVATE_KEY tiene un formato inválido.');
  }

  return {
    enabled: true as const,
    projectId: projectId!,
    clientEmail: clientEmail!,
    privateKey,
  };
});
