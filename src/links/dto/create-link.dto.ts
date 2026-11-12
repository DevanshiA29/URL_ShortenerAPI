import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsSafeHttpUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeHttpUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          const url = value.trim();

          // eslint-disable-next-line no-control-regex
          if (!url || /[\u0000-\u001F\u007F]/.test(url)) {
            return false;
          }

          if (url.includes('\\')) {
            return false;
          }

          if (/%(?:3a|2f|5c)/i.test(url)) {
            return false;
          }

          try {
            const parsed = new URL(url);

            if (
              parsed.protocol !== 'http:' &&
              parsed.protocol !== 'https:'
            ) {
              return false;
            }

            if (parsed.username || parsed.password) {
              return false;
            }

            return Boolean(parsed.hostname);
          } catch {
            return false;
          }
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a safe HTTP or HTTPS URL`;
        },
      },
    });
  };
}

function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          const date = new Date(value);

          return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid future date`;
        },
      },
    });
  };
}

export class CreateLinkDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsSafeHttpUrl()
  long_url: string;

  @IsOptional()
  @IsISO8601()
  @IsFutureDate()
  expires_at?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
