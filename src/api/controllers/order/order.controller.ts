import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderRequestDto } from '../../dtos/create-order.request.dto';
import { OrderQueryDto } from '../../dtos/order-query.dto';
import {
  OrderService,
  PaginatedOrders,
} from '../../services/order/order.service';
import { Order } from '../../schemas/order.schema';

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
  @ApiOperation({ summary: 'List orders (newest first), paginated' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  async findAll(@Query() query: OrderQueryDto): Promise<PaginatedOrders> {
    return this.orderService.findManyPaginated(query);
  }
}
