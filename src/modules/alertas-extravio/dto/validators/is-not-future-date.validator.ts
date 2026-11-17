import { ValidateBy } from 'class-validator';

export function IsNotFutureDate(): PropertyDecorator {
  return ValidateBy({
    name: 'isNotFutureDate',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        Number.isFinite(Date.parse(value)) &&
        Date.parse(value) <= Date.now(),
      defaultMessage: () =>
        'fechaExtravio debe ser una fecha válida que no sea futura',
    },
  });
}
