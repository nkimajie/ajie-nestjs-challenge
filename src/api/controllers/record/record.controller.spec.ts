import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { RecordService } from '../../services/record/record.service';
import { CreateRecordRequestDTO } from '../../dtos/create-record.request.dto';
import { RecordCategory, RecordFormat } from '../../enum/record.enum';

describe('RecordController', () => {
  let recordController: RecordController;
  let recordService: jest.Mocked<Pick<RecordService, 'create' | 'findManyPaginated' | 'update'>>;

  beforeEach(async () => {
    recordService = {
      create: jest.fn(),
      findManyPaginated: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [{ provide: RecordService, useValue: recordService }],
    }).compile();

    recordController = module.get(RecordController);
  });

  it('should create a new record', async () => {
    const createRecordDto: CreateRecordRequestDTO = {
      artist: 'Test',
      album: 'Test Record',
      price: 100,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ALTERNATIVE,
    };

    const savedRecord = {
      _id: '1',
      name: 'Test Record',
      price: 100,
      qty: 10,
    };

    recordService.create.mockResolvedValue(savedRecord as any);

    const result = await recordController.create(createRecordDto);
    expect(result).toEqual(savedRecord);
    expect(recordService.create).toHaveBeenCalledWith(createRecordDto);
  });

  it('should return paginated records', async () => {
    const paginated = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
    recordService.findManyPaginated.mockResolvedValue(paginated);

    const result = await recordController.findAll({});
    expect(result).toEqual(paginated);
    expect(recordService.findManyPaginated).toHaveBeenCalledWith({});
  });
});
