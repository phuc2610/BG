import mongoose from 'mongoose';
import { Invoice } from '../src/models/invoice.model';
import { InventoryUnit } from '../src/models/inventoryUnit.model';
import { Product } from '../src/models/product.model';
import { Purchase } from '../src/models/purchase.model';
import { Quote } from '../src/models/quote.model';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/np';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const invoice = await Invoice.findOne({ invoiceCode: 'HD202609170001' }).lean();
  if (!invoice) {
    console.log('Invoice HD202609170001 not found! Let us check latest invoices:');
    const latest = await Invoice.find({}).sort({ createdAt: -1 }).limit(5).select('invoiceCode grandTotal totalCost profit createdAt isFinalized').lean();
    console.log(latest);
    process.exit(0);
  }

  console.log('=== INVOICE DETAILS ===');
  console.log('Invoice Code:', invoice.invoiceCode);
  console.log('Quote Code:', invoice.quoteCode);
  console.log('isFinalized:', invoice.isFinalized);
  console.log('Subtotal:', invoice.subtotal);
  console.log('GrandTotal:', invoice.grandTotal);
  console.log('TotalCost:', invoice.totalCost);
  console.log('Profit:', invoice.profit);

  if (invoice.quoteCode) {
    const quote = await Quote.findOne({ quoteCode: invoice.quoteCode }).lean();
    if (quote) {
      console.log('\n=== QUOTE ORIGIN ===');
      console.log('Quote Code:', quote.quoteCode);
      console.log('Quote totalCost:', quote.totalCost, 'profit:', quote.profit);
      for (const qi of quote.items) {
        console.log('  Quote Item:', qi.productSnapshot?.name);
        console.log('    inventoryItem ref:', qi.inventoryItem);
        console.log('    unitPrice:', qi.unitPrice, 'costPrice snapshot:', (qi.productSnapshot as any)?.costPrice);
      }
    }
  }

  console.log('\n=== INVOICE ITEMS ===');
  for (let idx = 0; idx < invoice.items.length; idx++) {
    const item = invoice.items[idx];
    console.log(`\n--- Item ${idx + 1}: ${item.productSnapshot?.name} (${item.productSnapshot?.productCode}) ---`);
    console.log('  productId in item:', item.productId);
    console.log('  inventoryItem ref in item:', item.inventoryItem);
    console.log('  Qty:', item.quantity, 'UnitPrice:', item.unitPrice, 'Total:', item.total);
    console.log('  selectedSerials:', item.selectedSerials);
    console.log('  serialNumber:', item.serialNumber);
    console.log('  costPrice in snapshot:', (item.productSnapshot as any)?.costPrice);

    const pId = item.productId || (item.productSnapshot as any)?.productId || (item.productSnapshot as any)?._id;
    const pCode = item.productSnapshot?.productCode;

    // Check all units for this product
    const allUnits = await InventoryUnit.find({
      $or: [
        { productId: pId },
        { productCode: pCode }
      ]
    }).sort({ createdAt: -1 }).lean();
    console.log(`  Found ${allUnits.length} InventoryUnits in DB for this product:`);
    for (const u of allUnits) {
      console.log(`    - Unit ID: ${u._id}, S/N: "${u.serialNumber || 'N/A'}", Status: ${u.status}, PurchaseCode: ${u.purchaseCode}, Supplier: ${u.supplierName}, PurchasePrice: ${u.purchasePrice}, SoldInvoice: ${u.soldInvoiceCode}`);
    }

    // Check all Purchases for this product
    const allPurchases = await Purchase.find({
      $or: [
        { 'items.product': pId },
        { 'items.productCode': pCode }
      ]
    }).sort({ purchaseDate: -1 }).lean();
    console.log(`  Found ${allPurchases.length} Purchases in DB for this product:`);
    for (const p of allPurchases) {
      const matched = p.items.filter((it: any) => it.productCode === pCode || String(it.product) === String(pId));
      for (const m of matched) {
        console.log(`    - Purchase: ${p.purchaseCode}, Date: ${p.purchaseDate?.toISOString().split('T')[0]}, Supplier: ${p.supplier?.name}, Qty: ${m.quantity}, CostPrice: ${m.costPrice}, Serials: ${m.serials?.join(', ') || 'None'}`);
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
