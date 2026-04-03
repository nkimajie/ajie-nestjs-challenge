import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Min } from 'class-validator';

export class CreateOrderRequestDto {
  @ApiProperty({
    description: 'MongoDB id of the record being ordered',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  recordId: string;

  @ApiProperty({ description: 'Number of copies to order', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
