import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderRequestDto } from '../dtos/create-order.request.dto';
import { OrderService } from '../services/order.service';
import { Order } from '../schemas/order.schema';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order for a record' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g. insufficient stock)',
  })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async create(@Body() dto: CreateOrderRequestDto): Promise<Order> {
    return this.orderService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (newest first)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async findAll(): Promise<Order[]> {
    return this.orderService.findAll();
  }
}
