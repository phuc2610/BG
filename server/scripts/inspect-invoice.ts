import mongoose from 'mongoose';
import { Invoice } from '../src/models/invoice.model';
import { InventoryUnit } from '../src/models/inventoryUnit.model';
import { Product } from '../src/models/product.model';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/np';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const invoice = await Invoice.findOne({ invoiceCode: 'HD202608080002' }).lean();
  if (!invoice) {
    console.log('Invoice HD202608080002 not found! Let us check latest invoices:');
    const latest = await Invoice.find({}).sort({ createdAt: -1 }).limit(5).lean();
    console.log(JSON.stringify(latest, null, 2));
    process.exit(0);
  }

  console.log('=== INVOICE DETAILS ===');
  console.log('Invoice Code:', invoice.invoiceCode);
  console.log('Subtotal:', invoice.subtotal);
  console.log('Discount:', invoice.discount);
  console.log('GrandTotal:', invoice.grandTotal);
  console.log('TotalCost:', invoice.totalCost);
  console.log('Profit:', invoice.profit);

  console.log('\n=== ITEMS ===');
  for (const item of invoice.items) {
    console.log('Item:', item.productSnapshot?.name);
    console.log('  Qty:', item.quantity);
    console.log('  UnitPrice:', item.unitPrice);
    console.log('  Total:', item.total);
    console.log('  Selected Serials:', item.selectedSerials);
    console.log('  Snapshot CostPrice:', (item.productSnapshot as any)?.costPrice);
    
    if (item.selectedSerials && item.selectedSerials.length > 0) {
      const units = await InventoryUnit.find({ serialNumber: { $in: item.selectedSerials } }).lean();
      console.log('  Matched Inventory Units:', units.map(u => ({ serial: u.serialNumber, purchasePrice: u.purchasePrice })));
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
