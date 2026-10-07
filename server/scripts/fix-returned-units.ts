import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Invoice } from '../src/models/invoice.model';
import { InventoryUnit } from '../src/models/inventoryUnit.model';
import { ReturnExchangeTransaction } from '../src/models/returnExchange.model';
import { InventoryUnitStatus } from '../src/types';
import { recalculateInvoiceFinancials } from '../src/services/returnExchange.service';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/np_computer';

async function fixReturnedUnits() {
  console.log('Connecting to DB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const invoices = await Invoice.find({
    'items.itemStatus': { $in: ['RETURNED', 'EXCHANGED'] },
  }).exec();

  console.log(`Found ${invoices.length} invoices with returned or exchanged items.`);

  let totalFixedUnits = 0;

  for (const inv of invoices) {
    console.log(`\nAnalyzing Invoice: ${inv.invoiceCode} (_id: ${inv._id})`);

    // Group items by productId
    const productItemMap = new Map<string, { activeSoldQty: number; returnedItems: any[] }>();

    for (let i = 0; i < inv.items.length; i++) {
      const it = inv.items[i];
      const prodId = it.productId?.toString() || (it.productSnapshot as any)?.productId?.toString() || (it.productSnapshot as any)?._id?.toString();
      if (!prodId) continue;

      if (!productItemMap.has(prodId)) {
        productItemMap.set(prodId, { activeSoldQty: 0, returnedItems: [] });
      }

      const entry = productItemMap.get(prodId)!;
      const status = it.itemStatus || 'SOLD';
      if (status === 'SOLD') {
        entry.activeSoldQty += (it.quantity || 1);
      } else if (status === 'RETURNED' || status === 'EXCHANGED') {
        entry.returnedItems.push({ item: it, order: i });
      }
    }

    for (const [prodId, info] of productItemMap.entries()) {
      if (info.returnedItems.length === 0) continue;

      // Find all InventoryUnits currently marked as sold for this invoice and productId
      const currentSoldUnits = await InventoryUnit.find({
        productId: prodId,
        soldInvoiceId: inv._id,
      }).exec();

      const excessCount = currentSoldUnits.length - info.activeSoldQty;
      console.log(`  Product ${prodId}: ActiveSoldQty = ${info.activeSoldQty}, DB Sold Units = ${currentSoldUnits.length}, Excess = ${excessCount}`);

      if (excessCount > 0) {
        // These units should have been returned to warehouse!
        // We take up to excessCount units and revert them to AVAILABLE
        const unitsToRevert = currentSoldUnits.slice(0, excessCount);

        for (const u of unitsToRevert) {
          console.log(`    -> Reverting Unit ${u._id} (S/N: ${u.serialNumber || 'N/A'}, Cost: ${u.purchasePrice}) to AVAILABLE`);
          u.status = InventoryUnitStatus.AVAILABLE;
          u.soldInvoiceId = undefined;
          u.soldInvoiceCode = undefined;
          u.soldAt = undefined;
          if (!u.history) u.history = [];
          u.history.push({
            action: 'TRẢ_HÀNG_VỀ_KHO',
            invoiceId: inv._id as any,
            invoiceCode: inv.invoiceCode,
            note: `Fix đồng bộ kho: Trả lại kho do hóa đơn ${inv.invoiceCode} đã trả hàng`,
            date: new Date(),
          });
          await u.save();
          totalFixedUnits++;
        }
      }
    }

    // Fix ReturnExchangeTransaction originalCostPrice if needed
    const txs = await ReturnExchangeTransaction.find({ invoiceId: inv._id }).exec();
    for (const tx of txs) {
      let txModified = false;
      if (tx.returnedItems && tx.returnedItems.length > 0) {
        for (const retItem of tx.returnedItems) {
          const matchingInvItem = inv.items[retItem.order];
          if (matchingInvItem && matchingInvItem.quantity > 1) {
            const sampleUnit = await InventoryUnit.findOne({
              productId: matchingInvItem.productId || (matchingInvItem.productSnapshot as any)?.productId || (matchingInvItem.productSnapshot as any)?._id,
              purchasePrice: { $gt: 0 }
            }).exec();
            const unitCost = sampleUnit?.purchasePrice || (matchingInvItem.productSnapshot as any)?.costPrice || 0;
            const expectedTotalCost = unitCost * matchingInvItem.quantity;

            if (retItem.originalCostPrice < expectedTotalCost && expectedTotalCost > 0) {
              console.log(`    -> Fixing TX ${tx.transactionCode} returnedItem originalCostPrice: ${retItem.originalCostPrice} -> ${expectedTotalCost}`);
              retItem.originalCostPrice = expectedTotalCost;
              txModified = true;
            }
          }
        }
      }

      if (txModified) {
        let totalCostOfReturnedUnits = tx.returnedItems.reduce((sum, r) => sum + (r.originalCostPrice || 0), 0);
        tx.profitAdjustment = tx.totalRetainedAmount - (tx.totalOriginalValue - totalCostOfReturnedUnits);
        await tx.save();
        console.log(`    -> Saved updated ReturnExchangeTransaction ${tx.transactionCode}`);
      }
    }

    // Recalculate invoice financials
    await recalculateInvoiceFinancials(inv);
    await inv.save();
    console.log(`  -> Recalculated and saved Invoice ${inv.invoiceCode}`);
  }

  console.log(`\n✅ DONE! Total inventory units reverted back to stock: ${totalFixedUnits}`);
  process.exit(0);
}

fixReturnedUnits().catch((err) => {
  console.error('Error running fix:', err);
  process.exit(1);
});
