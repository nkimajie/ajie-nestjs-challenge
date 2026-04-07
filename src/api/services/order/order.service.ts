import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../../schemas/order.schema';
import { Record as RecordDocument } from '../../schemas/record.schema';
import { CreateOrderRequestDto } from '../../dtos/create-order.request.dto';
import { OrderQueryDto } from '../../dtos/order-query.dto';

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('Record') private readonly recordModel: Model<RecordDocument>,
  ) {}

  async create(dto: CreateOrderRequestDto): Promise<Order> {
    const record = await this.recordModel.findById(dto.recordId).exec();
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    if (record.qty < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock: ${record.qty} available, ${dto.quantity} requested.`,
      );
    }

    const order = await this.orderModel.create({
      recordId: new Types.ObjectId(dto.recordId),
      quantity: dto.quantity,
    });

    await this.recordModel.findByIdAndUpdate(dto.recordId, {
      $inc: { qty: -dto.quantity },
    });

    return order;
  }

  async findManyPaginated(query: OrderQueryDto): Promise<PaginatedOrders> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<Order[]>,
      this.orderModel.countDocuments().exec(),
    ]);

    return {
      items: items as Order[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }
}
