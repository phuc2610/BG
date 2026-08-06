import mongoose from 'mongoose';
import {
  Invoice,
  InventoryUnit,
  Product,
  ReturnExchangeTransaction,
  generateReturnExchangeCode,
} from '../models';
import {
  InvoiceStatus,
  InventoryUnitStatus,
  ReturnExchangeType,
  ReturnItemCondition,
  IReturnItem,
  IExchangeItem,
} from '../types';
import { AppError } from './product.service';
import { CustomerService } from './customer.service';

const customerService = new CustomerService();

export interface ProcessReturnInput {
  items: Array<{
    order: number; // item index in invoice.items
    refundAmount: number; // Cash/transfer refunded
    debtReduction: number; // Debt reduced
    condition: ReturnItemCondition; // Tốt / nhập kho, Chờ kiểm tra, Lỗi / bảo hành, Hỏng
  }>;
  reason?: string;
  notes?: string;
}

export interface ProcessExchangeInput {
  exchanges: Array<{
    order: number; // item index in invoice.items
    oldCondition: ReturnItemCondition;

    newProductId: string;
    newSerialNumber?: string;
    newSalePrice: number;

    customerPaidExtra: number;
    customerDebtAdded: number;
    cashRefund: number;
    debtReduction: number;
  }>;
  reason?: string;
  notes?: string;
}

export class ReturnExchangeService {
  /**
   * Fetches all Return/Exchange transactions for an invoice
   */
  async getInvoiceTransactions(invoiceId: string) {
    return ReturnExchangeTransaction.find({ invoiceId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Process RETURN of one or multiple items from a finalized invoice.
   */
  async processReturn(
    invoiceId: string,
    data: ProcessReturnInput,
    createdBy: string = 'Admin'
  ) {
    if (!data.items || data.items.length === 0) {
      throw new AppError('Vui lòng chọn ít nhất 1 sản phẩm để trả hàng', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) throw new AppError('Hóa đơn không tồn tại', 404);
      if (!invoice.isFinalized) {
        throw new AppError('Chỉ được trả hàng trên hóa đơn ĐÃ CHỐT', 400);
      }

      const now = new Date();
      const transactionCode = await generateReturnExchangeCode(ReturnExchangeType.RETURN);

      const returnedItemsLog: IReturnItem[] = [];
      let totalOriginalValue = 0;
      let totalRefundAmount = 0;
      let totalDebtReduction = 0;
      let totalRetainedAmount = 0;
      let totalCostOfReturnedUnits = 0;

      // Validate & process each selected item line
      for (const reqItem of data.items) {
        const item = invoice.items[reqItem.order];
        if (!item) {
          throw new AppError(`Mục sản phẩm ở vị trí ${reqItem.order + 1} không tồn tại trong hóa đơn`, 400);
        }

        const currentStatus = item.itemStatus || 'SOLD';
        if (currentStatus !== 'SOLD') {
          throw new AppError(
            `Sản phẩm "${item.productSnapshot?.name}" (Vị trí ${reqItem.order + 1}) đã được ${
              currentStatus === 'RETURNED' ? 'TRẢ' : 'ĐỔI'
            } trước đó rồi`,
            400
          );
        }

        const originalSalePrice = item.total || item.unitPrice * item.quantity;
        let originalCostPrice = 0;

        // Determine inventory target status based on returned condition
        let inventoryStatusTarget = InventoryUnitStatus.AVAILABLE;
        if (reqItem.condition === ReturnItemCondition.INSPECTION) {
          inventoryStatusTarget = InventoryUnitStatus.RETURN_INSPECTION;
        } else if (reqItem.condition === ReturnItemCondition.WARRANTY) {
          inventoryStatusTarget = InventoryUnitStatus.WARRANTY;
        } else if (reqItem.condition === ReturnItemCondition.DAMAGED) {
          inventoryStatusTarget = InventoryUnitStatus.DAMAGED;
        }

        // Revert serial unit(s) in InventoryUnit DB
        const serialsToReturn = (item.selectedSerials || []).filter((s) => s && s.trim());

        if (serialsToReturn.length > 0) {
          const units = await InventoryUnit.find({
            serialNumber: { $in: serialsToReturn },
            soldInvoiceId: invoice._id,
          }).session(session);

          for (const unit of units) {
            originalCostPrice += unit.purchasePrice || 0;

            unit.status = inventoryStatusTarget;
            unit.soldInvoiceId = undefined;
            unit.soldInvoiceCode = undefined;
            unit.soldAt = undefined;
            if (!unit.history) unit.history = [];
            unit.history.push({
              action: 'TRẢ_HÀNG_VỀ_KHO',
              invoiceId: invoice._id as any,
              invoiceCode: invoice.invoiceCode,
              note: `Trả hàng từ HĐ ${invoice.invoiceCode}. Tình trạng: ${reqItem.condition}`,
              date: now,
            });
            await unit.save({ session });
          }
        } else {
          // Non-serial item return
          let productId = item.productId || (item.productSnapshot as any)?.productId || (item.productSnapshot as any)?._id;
          if (productId) {
            const unit = await InventoryUnit.findOne({
              productId,
              soldInvoiceId: invoice._id,
            }).session(session);

            if (unit) {
              originalCostPrice = unit.purchasePrice || 0;
              unit.status = inventoryStatusTarget;
              unit.soldInvoiceId = undefined;
              unit.soldInvoiceCode = undefined;
              unit.soldAt = undefined;
              if (!unit.history) unit.history = [];
              unit.history.push({
                action: 'TRẢ_HÀNG_VỀ_KHO',
                invoiceId: invoice._id as any,
                invoiceCode: invoice.invoiceCode,
                note: `Trả hàng không serial từ HĐ ${invoice.invoiceCode}. Tình trạng: ${reqItem.condition}`,
                date: now,
              });
              await unit.save({ session });
            }
          }
        }

        totalCostOfReturnedUnits += originalCostPrice;

        const refundAmt = Math.max(0, Number(reqItem.refundAmount) || 0);
        const debtReduct = Math.max(0, Number(reqItem.debtReduction) || 0);
        const retainedAmt = Math.max(0, originalSalePrice - refundAmt - debtReduct);

        totalOriginalValue += originalSalePrice;
        totalRefundAmount += refundAmt;
        totalDebtReduction += debtReduct;
        totalRetainedAmount += retainedAmt;

        // Mark item status on Invoice document
        item.itemStatus = 'RETURNED';
        item.returnedAt = now;
        item.refundAmount = refundAmt;
        item.debtReduction = debtReduct;
        item.retainedAmount = retainedAmt;

        returnedItemsLog.push({
          order: reqItem.order,
          productId: item.productId ? item.productId.toString() : undefined,
          productCode: item.productSnapshot?.productCode || '',
          productName: item.productSnapshot?.name || 'Sản phẩm',
          serialNumber: item.serialNumber || (item.selectedSerials || []).join(', '),
          originalSalePrice,
          originalCostPrice,
          refundAmount: refundAmt,
          debtReduction: debtReduct,
          retainedAmount: retainedAmt,
          condition: reqItem.condition,
          inventoryStatusTarget,
          status: 'RETURNED',
        });
      }

      // Debt validation
      if (totalDebtReduction > invoice.remainingAmount) {
        throw new AppError(
          `Số tiền giảm công nợ (${totalDebtReduction.toLocaleString('vi-VN')}đ) vượt quá công nợ còn lại của hóa đơn (${invoice.remainingAmount.toLocaleString('vi-VN')}đ)`,
          400
        );
      }

      // Adjust invoice remaining amount
      invoice.remainingAmount = Math.max(0, invoice.remainingAmount - totalDebtReduction);

      // Profit adjustment:
      // Returned item is back in stock => Cost is 0 out of COGS. Profit for returned item = retainedAmount.
      // Net Profit Adjustment = totalRetainedAmount - (originalSalesForReturnedItems - originalCostForReturnedItems)
      const originalReturnedProfit = totalOriginalValue - totalCostOfReturnedUnits;
      const profitAdjustment = totalRetainedAmount - originalReturnedProfit;

      // Update invoice realized profit
      invoice.profit = Math.max(0, (invoice.profit || 0) + profitAdjustment);

      // Update invoice status
      const allItemsCount = invoice.items.length;
      const returnedCount = invoice.items.filter((i) => i.itemStatus === 'RETURNED').length;
      const exchangedCount = invoice.items.filter((i) => i.itemStatus === 'EXCHANGED').length;

      if (returnedCount === allItemsCount) {
        invoice.status = InvoiceStatus.FULLY_RETURNED;
      } else if (returnedCount > 0) {
        invoice.status = InvoiceStatus.PARTIALLY_RETURNED;
      }

      // Create transaction document
      const tx = new ReturnExchangeTransaction({
        transactionCode,
        invoiceId: invoice._id,
        invoiceCode: invoice.invoiceCode,
        customerId: invoice.customerId,
        customerName: invoice.customer?.name || 'Khách lẻ',
        type: ReturnExchangeType.RETURN,
        returnedItems: returnedItemsLog,
        exchangedItems: [],
        totalOriginalValue,
        totalRefundAmount,
        totalDebtReduction,
        totalRetainedAmount,
        totalCustomerPaidExtra: 0,
        totalCustomerDebtAdded: 0,
        profitAdjustment,
        reason: data.reason,
        notes: data.notes,
        createdBy,
      });

      await tx.save({ session });

      // Link transaction ID to invoice items
      for (const reqItem of data.items) {
        invoice.items[reqItem.order].returnExchangeTxId = tx._id as any;
      }

      invoice.history.push({
        action: 'TRẢ_HÀNG',
        description: `Thực hiện TRẢ HÀNG [${transactionCode}]: ${returnedItemsLog.length} sản phẩm (Hoàn tiền: ${totalRefundAmount.toLocaleString('vi-VN')}đ, Giảm nợ: ${totalDebtReduction.toLocaleString('vi-VN')}đ, Giữ lại: ${totalRetainedAmount.toLocaleString('vi-VN')}đ)`,
        performedBy: createdBy,
        createdAt: now,
      });

      await invoice.save({ session });
      await session.commitTransaction();

      // Log activity to CRM asynchronously
      if (invoice.customerId) {
        customerService
          .logActivity(invoice.customerId.toString(), {
            action: 'TRẢ_HÀNG',
            description: `Trả hàng hóa đơn ${invoice.invoiceCode} [Giao dịch ${transactionCode}]. Hoàn tiền: ${totalRefundAmount.toLocaleString('vi-VN')}đ, Giảm nợ: ${totalDebtReduction.toLocaleString('vi-VN')}đ`,
            relatedInvoiceId: invoice._id.toString(),
            relatedInvoiceCode: invoice.invoiceCode,
            amount: totalRefundAmount,
            performedBy: createdBy,
          })
          .catch((e) => console.error('Log customer return activity error:', e));

        customerService
          .getFullProfile(invoice.customerId.toString())
          .catch((e) => console.error('Sync customer CRM metrics error:', e));
      }

      return {
        transaction: tx,
        invoice,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process EXCHANGE of one or multiple items from a finalized invoice.
   */
  async processExchange(
    invoiceId: string,
    data: ProcessExchangeInput,
    createdBy: string = 'Admin'
  ) {
    if (!data.exchanges || data.exchanges.length === 0) {
      throw new AppError('Vui lòng chọn ít nhất 1 sản phẩm để đổi hàng', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) throw new AppError('Hóa đơn không tồn tại', 404);
      if (!invoice.isFinalized) {
        throw new AppError('Chỉ được đổi hàng trên hóa đơn ĐÃ CHỐT', 400);
      }

      const now = new Date();
      const transactionCode = await generateReturnExchangeCode(ReturnExchangeType.EXCHANGE);

      const exchangedItemsLog: IExchangeItem[] = [];
      let totalOriginalValue = 0;
      let totalNewValue = 0;
      let totalRefundAmount = 0;
      let totalDebtReduction = 0;
      let totalPaidExtra = 0;
      let totalDebtAdded = 0;
      let totalProfitAdjustment = 0;

      for (const exReq of data.exchanges) {
        const oldItem = invoice.items[exReq.order];
        if (!oldItem) {
          throw new AppError(`Mục sản phẩm ở vị trí ${exReq.order + 1} không tồn tại`, 400);
        }

        const currentStatus = oldItem.itemStatus || 'SOLD';
        if (currentStatus !== 'SOLD') {
          throw new AppError(
            `Sản phẩm "${oldItem.productSnapshot?.name}" (Vị trí ${exReq.order + 1}) đã được ${
              currentStatus === 'RETURNED' ? 'TRẢ' : 'ĐỔI'
            } trước đó rồi`,
            400
          );
        }

        // 1. Revert Old Serial / Inventory Unit to stock
        const oldSalePrice = oldItem.total || oldItem.unitPrice * oldItem.quantity;
        let oldCostPrice = 0;

        let oldStatusTarget = InventoryUnitStatus.AVAILABLE;
        if (exReq.oldCondition === ReturnItemCondition.INSPECTION) {
          oldStatusTarget = InventoryUnitStatus.RETURN_INSPECTION;
        } else if (exReq.oldCondition === ReturnItemCondition.WARRANTY) {
          oldStatusTarget = InventoryUnitStatus.WARRANTY;
        } else if (exReq.oldCondition === ReturnItemCondition.DAMAGED) {
          oldStatusTarget = InventoryUnitStatus.DAMAGED;
        }

        const oldSerials = (oldItem.selectedSerials || []).filter((s) => s && s.trim());
        if (oldSerials.length > 0) {
          const oldUnits = await InventoryUnit.find({
            serialNumber: { $in: oldSerials },
            soldInvoiceId: invoice._id,
          }).session(session);

          for (const u of oldUnits) {
            oldCostPrice += u.purchasePrice || 0;
            u.status = oldStatusTarget;
            u.soldInvoiceId = undefined;
            u.soldInvoiceCode = undefined;
            u.soldAt = undefined;
            if (!u.history) u.history = [];
            u.history.push({
              action: 'ĐỔI_HÀNG_NHẬP_LẠI',
              invoiceId: invoice._id as any,
              invoiceCode: invoice.invoiceCode,
              note: `Khách đổi sản phẩm lấy mã ${exReq.newProductId}. Tình trạng: ${exReq.oldCondition}`,
              date: now,
            });
            await u.save({ session });
          }
        } else {
          let oldProdId = oldItem.productId || (oldItem.productSnapshot as any)?.productId || (oldItem.productSnapshot as any)?._id;
          if (oldProdId) {
            const u = await InventoryUnit.findOne({
              productId: oldProdId,
              soldInvoiceId: invoice._id,
            }).session(session);

            if (u) {
              oldCostPrice = u.purchasePrice || 0;
              u.status = oldStatusTarget;
              u.soldInvoiceId = undefined;
              u.soldInvoiceCode = undefined;
              u.soldAt = undefined;
              if (!u.history) u.history = [];
              u.history.push({
                action: 'ĐỔI_HÀNG_NHẬP_LẠI',
                invoiceId: invoice._id as any,
                invoiceCode: invoice.invoiceCode,
                note: `Khách đổi sản phẩm không serial`,
                date: now,
              });
              await u.save({ session });
            }
          }
        }

        // 2. Fetch and Lock NEW Replacement Item & Serial with Concurrency Control
        const newProd = await Product.findById(exReq.newProductId).session(session);
        if (!newProd) {
          throw new AppError(`Sản phẩm mới (ID: ${exReq.newProductId}) không tồn tại`, 404);
        }

        let newUnitDoc: any = null;
        if (exReq.newSerialNumber && exReq.newSerialNumber.trim()) {
          // Atomic update with status filter to prevent race conditions
          newUnitDoc = await InventoryUnit.findOneAndUpdate(
            {
              serialNumber: exReq.newSerialNumber.trim(),
              productId: newProd._id,
              status: InventoryUnitStatus.AVAILABLE,
            },
            {
              status: InventoryUnitStatus.SOLD,
              soldInvoiceId: invoice._id,
              soldInvoiceCode: invoice.invoiceCode,
              soldAt: now,
              $push: {
                history: {
                  action: 'ĐỔI_HÀNG_XUẤT_KHO',
                  invoiceId: invoice._id,
                  invoiceCode: invoice.invoiceCode,
                  note: `Xuất đổi cho HĐ ${invoice.invoiceCode}`,
                  date: now,
                },
              },
            },
            { session, new: true }
          );

          if (!newUnitDoc) {
            throw new AppError(
              `Serial "${exReq.newSerialNumber}" vừa được sử dụng hoặc không còn ở trạng thái sẵn sàng trong kho`,
              400
            );
          }
        } else {
          // Select any available inventory unit for this product
          newUnitDoc = await InventoryUnit.findOneAndUpdate(
            {
              productId: newProd._id,
              status: InventoryUnitStatus.AVAILABLE,
            },
            {
              status: InventoryUnitStatus.SOLD,
              soldInvoiceId: invoice._id,
              soldInvoiceCode: invoice.invoiceCode,
              soldAt: now,
              $push: {
                history: {
                  action: 'ĐỔI_HÀNG_XUẤT_KHO',
                  invoiceId: invoice._id,
                  invoiceCode: invoice.invoiceCode,
                  note: `Xuất đổi cho HĐ ${invoice.invoiceCode}`,
                  date: now,
                },
              },
            },
            { session, new: true }
          );

          if (!newUnitDoc) {
            throw new AppError(
              `Sản phẩm "${newProd.name}" hiện không còn đơn vị nào sẵn sàng trong kho`,
              400
            );
          }
        }

        const newSalePrice = Math.max(0, Number(exReq.newSalePrice) || 0);
        const newCostPrice = newUnitDoc.purchasePrice || 0;
        const priceDifference = newSalePrice - oldSalePrice;

        const customerPaidExtra = Math.max(0, Number(exReq.customerPaidExtra) || 0);
        const customerDebtAdded = Math.max(0, Number(exReq.customerDebtAdded) || 0);
        const cashRefund = Math.max(0, Number(exReq.cashRefund) || 0);
        const debtReduction = Math.max(0, Number(exReq.debtReduction) || 0);

        totalOriginalValue += oldSalePrice;
        totalNewValue += newSalePrice;
        totalPaidExtra += customerPaidExtra;
        totalDebtAdded += customerDebtAdded;
        totalRefundAmount += cashRefund;
        totalDebtReduction += debtReduction;

        // Profit logic for exchanged item:
        // Old item returned -> Old cost 0 out of COGS. Profit realized from old item = retainedAmount.
        // New item sold -> Profit realized from new item = newSalePrice - newCostPrice.
        // Net Profit Adjustment = (newSalePrice - newCostPrice) - (oldSalePrice - oldCostPrice) + customerPaidExtra
        const itemProfitAdjustment = (newSalePrice - newCostPrice) - (oldSalePrice - oldCostPrice) + (oldSalePrice - cashRefund - debtReduction - newSalePrice);
        totalProfitAdjustment += itemProfitAdjustment;

        // Mark old item as EXCHANGED on Invoice document
        oldItem.itemStatus = 'EXCHANGED';
        oldItem.returnedAt = now;
        oldItem.exchangedToItem = {
          productId: newProd._id.toString(),
          productCode: newProd.productCode,
          productName: newProd.name,
          serialNumber: newUnitDoc.serialNumber,
          unitPrice: newSalePrice,
          costPrice: newCostPrice,
        };

        exchangedItemsLog.push({
          order: exReq.order,
          oldProductId: oldItem.productId ? oldItem.productId.toString() : undefined,
          oldProductCode: oldItem.productSnapshot?.productCode || '',
          oldProductName: oldItem.productSnapshot?.name || 'Sản phẩm cũ',
          oldSerialNumber: oldItem.serialNumber || (oldItem.selectedSerials || []).join(', '),
          oldSalePrice,
          oldCostPrice,
          oldCondition: exReq.oldCondition,
          oldInventoryStatusTarget: oldStatusTarget,

          newProductId: newProd._id.toString(),
          newProductCode: newProd.productCode,
          newProductName: newProd.name,
          newSerialNumber: newUnitDoc.serialNumber,
          newSalePrice,
          newCostPrice,

          priceDifference,
          customerPaidExtra,
          customerDebtAdded,
          cashRefund,
          debtReduction,
          retainedAmount: Math.max(0, oldSalePrice + customerPaidExtra - newSalePrice - cashRefund - debtReduction),
          status: 'EXCHANGED',
        });
      }

      // Customer debt adjustments
      if (totalDebtReduction > invoice.remainingAmount) {
        throw new AppError(
          `Số tiền giảm công nợ (${totalDebtReduction.toLocaleString('vi-VN')}đ) vượt quá công nợ còn lại của hóa đơn (${invoice.remainingAmount.toLocaleString('vi-VN')}đ)`,
          400
        );
      }

      invoice.remainingAmount = Math.max(0, invoice.remainingAmount - totalDebtReduction + totalDebtAdded);
      invoice.totalPaid += totalPaidExtra;
      invoice.profit = Math.max(0, (invoice.profit || 0) + totalProfitAdjustment);

      // Invoice status update
      const allItemsCount = invoice.items.length;
      const exchangedCount = invoice.items.filter((i) => i.itemStatus === 'EXCHANGED').length;
      if (exchangedCount === allItemsCount) {
        invoice.status = InvoiceStatus.EXCHANGED;
      } else {
        invoice.status = InvoiceStatus.PARTIALLY_EXCHANGED;
      }

      // Transaction log
      const tx = new ReturnExchangeTransaction({
        transactionCode,
        invoiceId: invoice._id,
        invoiceCode: invoice.invoiceCode,
        customerId: invoice.customerId,
        customerName: invoice.customer?.name || 'Khách lẻ',
        type: ReturnExchangeType.EXCHANGE,
        returnedItems: [],
        exchangedItems: exchangedItemsLog,
        totalOriginalValue,
        totalRefundAmount,
        totalDebtReduction,
        totalRetainedAmount: 0,
        totalCustomerPaidExtra: totalPaidExtra,
        totalCustomerDebtAdded: totalDebtAdded,
        profitAdjustment: totalProfitAdjustment,
        reason: data.reason,
        notes: data.notes,
        createdBy,
      });

      await tx.save({ session });

      // Link tx to invoice items
      for (const exReq of data.exchanges) {
        invoice.items[exReq.order].returnExchangeTxId = tx._id as any;
      }

      invoice.history.push({
        action: 'ĐỔI_HÀNG',
        description: `Thực hiện ĐỔI HÀNG [${transactionCode}]: ${exchangedItemsLog.length} sản phẩm (Khách bù: ${totalPaidExtra.toLocaleString('vi-VN')}đ, Nợ thêm: ${totalDebtAdded.toLocaleString('vi-VN')}đ, Hoàn tiền: ${totalRefundAmount.toLocaleString('vi-VN')}đ)`,
        performedBy: createdBy,
        createdAt: now,
      });

      await invoice.save({ session });
      await session.commitTransaction();

      // Log activity to CRM asynchronously
      if (invoice.customerId) {
        customerService
          .logActivity(invoice.customerId.toString(), {
            action: 'ĐỔI_HÀNG',
            description: `Đổi hàng hóa đơn ${invoice.invoiceCode} [Giao dịch ${transactionCode}]. Khách bù: ${totalPaidExtra.toLocaleString('vi-VN')}đ, Nợ thêm: ${totalDebtAdded.toLocaleString('vi-VN')}đ`,
            relatedInvoiceId: invoice._id.toString(),
            relatedInvoiceCode: invoice.invoiceCode,
            amount: totalPaidExtra,
            performedBy: createdBy,
          })
          .catch((e) => console.error('Log customer exchange activity error:', e));

        customerService
          .getFullProfile(invoice.customerId.toString())
          .catch((e) => console.error('Sync customer CRM metrics error:', e));
      }

      return {
        transaction: tx,
        invoice,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
