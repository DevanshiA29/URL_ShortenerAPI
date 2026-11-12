import 'dotenv/config';
import mongoose, { Schema } from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);

  const linkSchema = new Schema(
    {
      code: { type: String, required: true, unique: true },
      long_url: { type: String, required: true },
      created_by: { type: String, required: true, index: true },
      expires_at: Date,
      tags: { type: [String], default: [] },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: false } },
  );

  const clickEventSchema = new Schema({
    link_id: { type: Schema.Types.ObjectId, required: true, ref: 'Link' },
    clicked_at: { type: Date, required: true, default: Date.now },
    user_agent: { type: String, default: '' },
    referrer: { type: String, default: '' },
    ip_hash: { type: String, default: '' },
  });

  clickEventSchema.index({ link_id: 1, clicked_at: -1 });

  const LinkModel = mongoose.models.Link || mongoose.model('Link', linkSchema);
  const ClickEventModel =
    mongoose.models.ClickEvent ||
    mongoose.model('ClickEvent', clickEventSchema);

  await LinkModel.init();
  await ClickEventModel.init();

  console.log('LINK INDEXES');
  console.log(await LinkModel.collection.getIndexes());

  console.log('CLICK EVENT INDEXES');
  console.log(await ClickEventModel.collection.getIndexes());

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
