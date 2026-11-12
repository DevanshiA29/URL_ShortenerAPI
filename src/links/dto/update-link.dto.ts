import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLinkDto {
  @ApiProperty({
    description: 'Updated destination target URL',
    example: 'https://github.com/DevanshiA29/URL_ShortenerAPI/blob/main/README.md',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  long_url: string;

  @ApiPropertyOptional({
    description: 'Updated tags array',
    example: ['updated', 'production'],
  })
  @IsOptional()
  tags?: string[];
}
