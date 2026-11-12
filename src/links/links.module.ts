import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Link, LinkSchema } from './link.schema';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Link.name,
        schema: LinkSchema,
      },
    ]),
    CacheModule,
  ],
  controllers: [LinksController],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
