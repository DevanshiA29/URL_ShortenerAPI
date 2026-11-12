import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);

  const links = mongoose.connection.collection('links');

  const code = `upsk-demo-${Date.now()}`;
  const longUrl = 'https://example.com/module-02';

  await links.insertOne({
    code,
    long_url: longUrl,
    created_by: 'module-02-test-user',
    tags: [],
    created_at: new Date(),
  });

  const selected = await links.findOne({ code });

  console.log(`inserted code: ${code}`);
  console.log(`selected code: ${selected?.code}`);
  console.log(`matched long_url: ${selected?.long_url}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
