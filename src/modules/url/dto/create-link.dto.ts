import { IsUrl, IsOptional, IsDateString } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({ require_tld: true })
  originalUrl: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
