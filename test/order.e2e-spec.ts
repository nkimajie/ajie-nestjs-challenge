import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RecordFormat, RecordCategory } from '../src/api/schemas/record.enum';

jest.setTimeout(120_000);

describe('OrderController (e2e)', () => {
  let app: INestApplication;
  let recordId: string;
  let orderModel;
  let recordModel;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URL = mongod.getUri();
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    orderModel = moduleFixture.get(getModelToken('Order'));
    recordModel = moduleFixture.get(getModelToken('Record'));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongod?.stop();
  });

  beforeEach(async () => {
    await orderModel.deleteMany({});
    await recordModel.deleteMany({});
    recordId = undefined as unknown as string;
  });

  it('should create an order and reduce stock', async () => {
    const createRecord = await request(app.getHttpServer())
      .post('/records')
      .send({
        artist: 'Order Test Artist',
        album: 'Order Test Album',
        price: 15,
        qty: 5,
        format: RecordFormat.CD,
        category: RecordCategory.JAZZ,
      })
      .expect(201);

    recordId = createRecord.body._id;

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .send({ recordId, quantity: 2 })
      .expect(201);

    expect(orderRes.body.quantity).toBe(2);
    expect(String(orderRes.body.recordId)).toBe(String(recordId));

    const recordAfter = await recordModel.findById(recordId).lean();
    expect(recordAfter.qty).toBe(3);
  });
});
