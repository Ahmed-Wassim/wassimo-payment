import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRefundDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount_minor!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
