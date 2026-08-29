import mongoose from 'mongoose';
import { getSettings } from '../src/models/settings.model';
import { Invoice } from '../src/models/invoice.model';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/np';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const settings = await getSettings();
  console.log('=== SETTINGS IMAGES ===');
  console.log('logoUrl:', settings?.logoUrl);
  console.log('signatureUrl:', settings?.signatureUrl);
  console.log('stampUrl:', settings?.stampUrl);
  console.log('thankYouAssetUrl:', settings?.thankYouAssetUrl);
  console.log('qrPaymentUrl:', settings?.qrPaymentUrl);
  console.log('bankInfo:', settings?.bankInfo);

  const invoice = await Invoice.findOne({ invoiceCode: 'HD202608080002' }).lean();
  if (invoice) {
    console.log('\n=== INVOICE IMAGES ===');
    for (const item of invoice.items) {
      console.log('Product:', item.productSnapshot?.name);
      console.log('  imageUrl:', item.productSnapshot?.imageUrl);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
