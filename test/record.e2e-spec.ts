import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RecordFormat, RecordCategory } from '../src/api/enum/record.enum';

jest.setTimeout(120_000);

describe('RecordController (e2e)', () => {
  let app: INestApplication;
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
    await recordModel.deleteMany({});
  });

  it('should create a new record', async () => {
    const createRecordDto = {
      artist: 'The Beatles',
      album: 'Abbey Road',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const response = await request(app.getHttpServer())
      .post('/records')
      .send(createRecordDto)
      .expect(201);

    expect(response.body).toHaveProperty('artist', 'The Beatles');
    expect(response.body).toHaveProperty('album', 'Abbey Road');
    expect(response.body.tracklist).toEqual([]);
  });

  it('should create a record and fetch it with filters (paginated)', async () => {
    const createRecordDto = {
      artist: 'The Fake Band',
      album: 'Fake Album',
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const createResponse = await request(app.getHttpServer())
      .post('/records')
      .send(createRecordDto)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/records?artist=The Fake Band')
      .expect(200);

    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    const found = response.body.items.find(
      (r: { artist: string }) => r.artist === 'The Fake Band',
    );
    expect(found).toBeDefined();
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(response.body).toHaveProperty('totalPages');
  });
});
