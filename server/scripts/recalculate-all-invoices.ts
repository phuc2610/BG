import mongoose from 'mongoose';
import { Invoice } from '../src/models/invoice.model';
import { recalculateInvoiceFinancials } from '../src/services/returnExchange.service';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/np';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const invoices = await Invoice.find({ isFinalized: true }).exec();
  console.log(`Found ${invoices.length} finalized invoices to recalculate...`);

  for (const inv of invoices) {
    const oldCost = inv.totalCost;
    const oldProfit = inv.profit;
    await recalculateInvoiceFinancials(inv);
    await inv.save();
    console.log(`Updated Invoice [${inv.invoiceCode}]: GrandTotal=${inv.grandTotal}, Old Cost=${oldCost} -> New Cost=${inv.totalCost}, Old Profit=${oldProfit} -> New Profit=${inv.profit}`);
  }

  console.log('✅ All invoices recalculated successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error recalculating invoices:', err);
  process.exit(1);
});
