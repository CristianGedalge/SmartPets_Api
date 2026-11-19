import { firebaseConfig } from './firebase.config';

describe('firebaseConfig', () => {
  const names = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ] as const;
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  afterEach(() => {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('permite deshabilitar Firebase dejando las variables vacías', () => {
    for (const name of names) delete process.env[name];
    expect(firebaseConfig()).toEqual({
      enabled: false,
      projectId: undefined,
      clientEmail: undefined,
      privateKey: undefined,
    });
  });

  it('rechaza configuración incompleta', () => {
    process.env.FIREBASE_PROJECT_ID = 'smartpet-test';
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    expect(() => firebaseConfig()).toThrow('Configura FIREBASE_PROJECT_ID');
  });

  it('normaliza saltos de línea de la clave privada', () => {
    process.env.FIREBASE_PROJECT_ID = 'smartpet-test';
    process.env.FIREBASE_CLIENT_EMAIL =
      'firebase@smartpet-test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nsecret\\n-----END PRIVATE KEY-----\\n';
    expect(firebaseConfig()).toMatchObject({
      enabled: true,
      projectId: 'smartpet-test',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----',
    });
  });
});
