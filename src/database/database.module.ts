import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Link, LinkSchema } from '../links/link.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/upsk_sdf',
      {
        maxPoolSize: Number(process.env.DB_POOL_SIZE) || 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      },
    ),
    MongooseModule.forFeature([
      { name: Link.name, schema: LinkSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
