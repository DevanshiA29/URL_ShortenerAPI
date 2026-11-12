import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLinkDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  long_url: string;

  @IsOptional()
  tags?: string[];
}

