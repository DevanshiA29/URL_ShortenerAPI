import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Target URL to shorten (HTTP or HTTPS)',
    example: 'https://github.com/DevanshiA29/URL_ShortenerAPI',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsSafeHttpUrl()
  long_url: string;

  @ApiPropertyOptional({
    description: 'Optional ISO 8601 future expiration timestamp',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  @IsFutureDate()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Optional tags for categorization and search',
    example: ['engineering', 'github'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
