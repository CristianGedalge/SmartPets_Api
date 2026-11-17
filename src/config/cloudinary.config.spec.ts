import { cloudinaryConfig } from './cloudinary.config';

describe('cloudinaryConfig', () => {
  const names = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ] as const;
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });
  afterEach(() => {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it.each(names)(
    'rechaza %s ausente, vacía o en blanco, sin revelar valores',
    (name) => {
      delete process.env[name];
      expect(() => cloudinaryConfig()).toThrow(`Falta configurar ${name}`);
      for (const value of ['', '   ']) {
        process.env[name] = value;
        expect(() => cloudinaryConfig()).toThrow(`Falta configurar ${name}`);
      }
    },
  );

  it.each(['https://cloud.example', 'cloud/name', 'cloud name'])(
    'rechaza un cloud name inválido: %s',
    (value) => {
      process.env.CLOUDINARY_CLOUD_NAME = value;
      expect(() => cloudinaryConfig()).toThrow(
        'CLOUDINARY_CLOUD_NAME tiene un formato inválido',
      );
    },
  );

  it('devuelve la configuración normalizada', () => {
    process.env.CLOUDINARY_CLOUD_NAME = ' test-cloud ';
    process.env.CLOUDINARY_API_KEY = ' test-key ';
    process.env.CLOUDINARY_API_SECRET = ' test-secret ';
    expect(cloudinaryConfig()).toEqual({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });
  });
});
