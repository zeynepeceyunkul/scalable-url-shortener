import { IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class UpdateLinkDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
