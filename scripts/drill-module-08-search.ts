import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LinksController } from '../src/links/links.controller';
import { LinksService } from '../src/links/links.service';
import { CacheService } from '../src/cache/cache.service';
import { Link } from '../src/links/link.schema';

async function run() {
  console.log('=== TESTING MODULE 08 SEARCH IMPLEMENTATION ===');

  const mockLinks = [
    { _id: '1', code: 'c1', long_url: 'https://example.com/alpha', tags: ['tech'], created_at: new Date('2026-01-01') },
    { _id: '2', code: 'c2', long_url: 'https://example.com/beta', tags: ['tech', 'news'], created_at: new Date('2026-01-02') },
    { _id: '3', code: 'c3', long_url: 'https://google.com/search', tags: ['tools'], created_at: new Date('2026-01-03') },
  ];

  const mockModel: any = {
    find: (filter: any) => {
      let results = [...mockLinks];
      if (filter.tags) {
        results = results.filter((r) => r.tags.includes(filter.tags));
      }
      if (filter.long_url && filter.long_url.$regex) {
        const re = new RegExp(filter.long_url.$regex, filter.long_url.$options);
        results = results.filter((r) => re.test(r.long_url));
      }
      return {
        sort: () => ({
          skip: (s: number) => ({
            limit: (l: number) => ({
              maxTimeMS: () => ({
                lean: async () => results.slice(s, s + l),
              }),
            }),
          }),
        }),
      };
    },
    countDocuments: (filter: any) => ({
      maxTimeMS: async () => {
        let results = [...mockLinks];
        if (filter.tags) {
          results = results.filter((r) => r.tags.includes(filter.tags));
        }
        if (filter.long_url && filter.long_url.$regex) {
          const re = new RegExp(filter.long_url.$regex, filter.long_url.$options);
          results = results.filter((r) => re.test(r.long_url));
        }
        return results.length;
      },
    }),
  };

  const mockCache: any = {
    get: async () => null,
    set: async () => {},
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [LinksController],
    providers: [
      LinksService,
      { provide: getModelToken(Link.name), useValue: mockModel },
      { provide: CacheService, useValue: mockCache },
    ],
  }).compile();

  const controller = moduleRef.get<LinksController>(LinksController);

  console.log('\n[TEST 1] Search query q="example"');
  const res1 = await controller.search('example', undefined, '1', '10');
  console.log('Result 1 items count:', res1.items.length, 'Total:', res1.total, 'Page:', res1.page, 'PageSize:', res1.page_size);

  console.log('\n[TEST 2] Search tag="tech"');
  const res2 = await controller.search(undefined, 'tech', '1', '10');
  console.log('Result 2 items count:', res2.items.length, 'Total:', res2.total);

  console.log('\n[TEST 3] Cap oversized page_size (request 5000)');
  const res3 = await controller.search(undefined, undefined, '1', '5000');
  console.log('Requested 5000, actual page_size capped to:', res3.page_size);

  if (res3.page_size === 100 && res1.items.length === 2 && res2.items.length === 2) {
    console.log('\n✓ ALL SEARCH & PAGINATION ASSERTIONS PASSED');
  } else {
    throw new Error('Test assertions failed');
  }
}

run().catch(console.error);
