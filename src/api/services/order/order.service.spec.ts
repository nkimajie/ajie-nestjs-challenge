import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { RecordCategory, RecordFormat } from '../../enum/record.enum';

describe('OrderService', () => {
  let service: OrderService;
  let orderModel: {
    create: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let recordModel: { findById: jest.Mock; findByIdAndUpdate: jest.Mock };

  beforeEach(async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    orderModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
    };
    recordModel = { findById: jest.fn(), findByIdAndUpdate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getModelToken('Order'), useValue: orderModel },
        { provide: getModelToken('Record'), useValue: recordModel },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('throws when record missing', async () => {
    recordModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.create({ recordId: '507f1f77bcf86cd799439011', quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when insufficient stock', async () => {
    recordModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        qty: 1,
        artist: 'A',
        album: 'B',
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      }),
    });
    await expect(
      service.create({ recordId: '507f1f77bcf86cd799439011', quantity: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates order and decrements stock', async () => {
    recordModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ qty: 10 }),
    });
    orderModel.create.mockResolvedValue({ _id: 'order1', quantity: 2 });
    recordModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.create({
      recordId: '507f1f77bcf86cd799439011',
      quantity: 2,
    });

    expect(result.quantity).toBe(2);
    expect(recordModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { $inc: { qty: -2 } },
    );
  });

  it('returns paginated orders', async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'o1', quantity: 3 }]),
    };
    orderModel.find.mockReturnValue(findChain);
    orderModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(25),
    });

    const result = await service.findManyPaginated({ page: 2, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(findChain.skip).toHaveBeenCalledWith(10);
    expect(findChain.limit).toHaveBeenCalledWith(10);
  });
});
