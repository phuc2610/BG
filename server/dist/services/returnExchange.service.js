"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnExchangeService = void 0;
exports.recalculateInvoiceFinancials = recalculateInvoiceFinancials;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const types_1 = require("../types");
const product_service_1 = require("./product.service");
const customer_service_1 = require("./customer.service");
const customerService = new customer_service_1.CustomerService();
class ReturnExchangeService {
    /**
     * Fetches all Return/Exchange transactions for an invoice
     */
    async getInvoiceTransactions(invoiceId) {
        return models_1.ReturnExchangeTransaction.find({ invoiceId })
            .sort({ createdAt: -1 })
            .exec();
    }
    /**
     * Process RETURN of one or multiple items from a finalized invoice.
     */
    async processReturn(invoiceId, data, createdBy = 'Admin') {
        if (!data.items || data.items.length === 0) {
            throw new product_service_1.AppError('Vui lòng chọn ít nhất 1 sản phẩm để trả hàng', 400);
        }
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const invoice = await models_1.Invoice.findById(invoiceId).session(session);
            if (!invoice)
                throw new product_service_1.AppError('Hóa đơn không tồn tại', 404);
            if (!invoice.isFinalized) {
                throw new product_service_1.AppError('Chỉ được trả hàng trên hóa đơn ĐÃ CHỐT', 400);
            }
            const now = new Date();
            const transactionCode = await (0, models_1.generateReturnExchangeCode)(types_1.ReturnExchangeType.RETURN);
            const returnedItemsLog = [];
            let totalOriginalValue = 0;
            let totalRefundAmount = 0;
            let totalDebtReduction = 0;
            let totalRetainedAmount = 0;
            let totalCostOfReturnedUnits = 0;
            // Validate & process each selected item line
            for (const reqItem of data.items) {
                const item = invoice.items[reqItem.order];
                if (!item) {
                    throw new product_service_1.AppError(`Mục sản phẩm ở vị trí ${reqItem.order + 1} không tồn tại trong hóa đơn`, 400);
                }
                const currentStatus = item.itemStatus || 'SOLD';
                if (currentStatus !== 'SOLD') {
                    throw new product_service_1.AppError(`Sản phẩm "${item.productSnapshot?.name}" (Vị trí ${reqItem.order + 1}) đã được ${currentStatus === 'RETURNED' ? 'TRẢ' : 'ĐỔI'} trước đó rồi`, 400);
                }
                const originalSalePrice = item.total || item.unitPrice * item.quantity;
                let originalCostPrice = 0;
                // Determine inventory target status based on returned condition
                let inventoryStatusTarget = types_1.InventoryUnitStatus.AVAILABLE;
                if (reqItem.condition === types_1.ReturnItemCondition.INSPECTION) {
                    inventoryStatusTarget = types_1.InventoryUnitStatus.RETURN_INSPECTION;
                }
                else if (reqItem.condition === types_1.ReturnItemCondition.WARRANTY) {
                    inventoryStatusTarget = types_1.InventoryUnitStatus.WARRANTY;
                }
                else if (reqItem.condition === types_1.ReturnItemCondition.DAMAGED) {
                    inventoryStatusTarget = types_1.InventoryUnitStatus.DAMAGED;
                }
                // Revert serial unit(s) in InventoryUnit DB
                const serialsToReturn = (item.selectedSerials || []).filter((s) => s && s.trim());
                const totalQtyToReturn = item.quantity || 1;
                let unitsReturnedCount = 0;
                if (serialsToReturn.length > 0) {
                    const units = await models_1.InventoryUnit.find({
                        serialNumber: { $in: serialsToReturn },
                        soldInvoiceId: invoice._id,
                    }).session(session);
                    for (const unit of units) {
                        originalCostPrice += unit.purchasePrice || 0;
                        unit.status = inventoryStatusTarget;
                        unit.soldInvoiceId = undefined;
                        unit.soldInvoiceCode = undefined;
                        unit.soldAt = undefined;
                        if (!unit.history)
                            unit.history = [];
                        unit.history.push({
                            action: 'TRẢ_HÀNG_VỀ_KHO',
                            invoiceId: invoice._id,
                            invoiceCode: invoice.invoiceCode,
                            note: `Trả hàng từ HĐ ${invoice.invoiceCode}. Tình trạng: ${reqItem.condition}`,
                            date: now,
                        });
                        await unit.save({ session });
                        unitsReturnedCount++;
                    }
                }
                // Return remaining non-serial units (or all units if serialsToReturn was empty)
                const remainingQtyToReturn = totalQtyToReturn - unitsReturnedCount;
                if (remainingQtyToReturn > 0) {
                    let productId = item.productId || item.productSnapshot?.productId || item.productSnapshot?._id;
                    if (productId) {
                        const nonSerialUnits = await models_1.InventoryUnit.find({
                            productId,
                            soldInvoiceId: invoice._id,
                        })
                            .limit(remainingQtyToReturn)
                            .session(session);
                        for (const unit of nonSerialUnits) {
                            originalCostPrice += unit.purchasePrice || 0;
                            unit.status = inventoryStatusTarget;
                            unit.soldInvoiceId = undefined;
                            unit.soldInvoiceCode = undefined;
                            unit.soldAt = undefined;
                            if (!unit.history)
                                unit.history = [];
                            unit.history.push({
                                action: 'TRẢ_HÀNG_VỀ_KHO',
                                invoiceId: invoice._id,
                                invoiceCode: invoice.invoiceCode,
                                note: `Trả hàng không serial từ HĐ ${invoice.invoiceCode}. Tình trạng: ${reqItem.condition}`,
                                date: now,
                            });
                            await unit.save({ session });
                            unitsReturnedCount++;
                        }
                        // Fallback for remaining units if fewer InventoryUnit records were tracked
                        if (unitsReturnedCount < totalQtyToReturn) {
                            const fallbackCost = Number(item.productSnapshot?.costPrice) || (nonSerialUnits[0]?.purchasePrice) || 0;
                            originalCostPrice += fallbackCost * (totalQtyToReturn - unitsReturnedCount);
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
                throw new product_service_1.AppError(`Số tiền giảm công nợ (${totalDebtReduction.toLocaleString('vi-VN')}đ) vượt quá công nợ còn lại của hóa đơn (${invoice.remainingAmount.toLocaleString('vi-VN')}đ)`, 400);
            }
            // Adjust invoice remaining amount
            invoice.remainingAmount = Math.max(0, invoice.remainingAmount - totalDebtReduction);
            // Update invoice status
            const allItemsCount = invoice.items.length;
            const returnedCount = invoice.items.filter((i) => i.itemStatus === 'RETURNED').length;
            const exchangedCount = invoice.items.filter((i) => i.itemStatus === 'EXCHANGED').length;
            if (returnedCount === allItemsCount) {
                invoice.status = types_1.InvoiceStatus.FULLY_RETURNED;
            }
            else if (returnedCount > 0) {
                invoice.status = types_1.InvoiceStatus.PARTIALLY_RETURNED;
            }
            // Create transaction document
            const tx = new models_1.ReturnExchangeTransaction({
                transactionCode,
                invoiceId: invoice._id,
                invoiceCode: invoice.invoiceCode,
                customerId: invoice.customerId,
                customerName: invoice.customer?.name || 'Khách lẻ',
                type: types_1.ReturnExchangeType.RETURN,
                returnedItems: returnedItemsLog,
                exchangedItems: [],
                totalOriginalValue,
                totalRefundAmount,
                totalDebtReduction,
                totalRetainedAmount,
                totalCustomerPaidExtra: 0,
                totalCustomerDebtAdded: 0,
                profitAdjustment: totalRetainedAmount - (totalOriginalValue - totalCostOfReturnedUnits),
                reason: data.reason,
                notes: data.notes,
                createdBy,
            });
            await tx.save({ session });
            // Link transaction ID to invoice items
            for (const reqItem of data.items) {
                invoice.items[reqItem.order].returnExchangeTxId = tx._id;
            }
            // Recalculate exact totalCost and profit
            await recalculateInvoiceFinancials(invoice, session);
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
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            session.endSession();
        }
    }
    /**
     * Process EXCHANGE of one or multiple items from a finalized invoice.
     */
    async processExchange(invoiceId, data, createdBy = 'Admin') {
        if (!data.exchanges || data.exchanges.length === 0) {
            throw new product_service_1.AppError('Vui lòng chọn ít nhất 1 sản phẩm để đổi hàng', 400);
        }
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const invoice = await models_1.Invoice.findById(invoiceId).session(session);
            if (!invoice)
                throw new product_service_1.AppError('Hóa đơn không tồn tại', 404);
            if (!invoice.isFinalized) {
                throw new product_service_1.AppError('Chỉ được đổi hàng trên hóa đơn ĐÃ CHỐT', 400);
            }
            const now = new Date();
            const transactionCode = await (0, models_1.generateReturnExchangeCode)(types_1.ReturnExchangeType.EXCHANGE);
            const exchangedItemsLog = [];
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
                    throw new product_service_1.AppError(`Mục sản phẩm ở vị trí ${exReq.order + 1} không tồn tại`, 400);
                }
                const currentStatus = oldItem.itemStatus || 'SOLD';
                if (currentStatus !== 'SOLD') {
                    throw new product_service_1.AppError(`Sản phẩm "${oldItem.productSnapshot?.name}" (Vị trí ${exReq.order + 1}) đã được ${currentStatus === 'RETURNED' ? 'TRẢ' : 'ĐỔI'} trước đó rồi`, 400);
                }
                // 1. Revert Old Serial / Inventory Unit to stock
                const oldSalePrice = oldItem.total || oldItem.unitPrice * oldItem.quantity;
                let oldCostPrice = 0;
                let oldStatusTarget = types_1.InventoryUnitStatus.AVAILABLE;
                if (exReq.oldCondition === types_1.ReturnItemCondition.INSPECTION) {
                    oldStatusTarget = types_1.InventoryUnitStatus.RETURN_INSPECTION;
                }
                else if (exReq.oldCondition === types_1.ReturnItemCondition.WARRANTY) {
                    oldStatusTarget = types_1.InventoryUnitStatus.WARRANTY;
                }
                else if (exReq.oldCondition === types_1.ReturnItemCondition.DAMAGED) {
                    oldStatusTarget = types_1.InventoryUnitStatus.DAMAGED;
                }
                const oldSerials = (oldItem.selectedSerials || []).filter((s) => s && s.trim());
                const totalOldQtyToReturn = oldItem.quantity || 1;
                let oldUnitsReturnedCount = 0;
                if (oldSerials.length > 0) {
                    const oldUnits = await models_1.InventoryUnit.find({
                        serialNumber: { $in: oldSerials },
                        soldInvoiceId: invoice._id,
                    }).session(session);
                    for (const u of oldUnits) {
                        oldCostPrice += u.purchasePrice || 0;
                        u.status = oldStatusTarget;
                        u.soldInvoiceId = undefined;
                        u.soldInvoiceCode = undefined;
                        u.soldAt = undefined;
                        if (!u.history)
                            u.history = [];
                        u.history.push({
                            action: 'ĐỔI_HÀNG_NHẬP_LẠI',
                            invoiceId: invoice._id,
                            invoiceCode: invoice.invoiceCode,
                            note: `Khách đổi sản phẩm lấy mã ${exReq.newProductId}. Tình trạng: ${exReq.oldCondition}`,
                            date: now,
                        });
                        await u.save({ session });
                        oldUnitsReturnedCount++;
                    }
                }
                const remainingOldQtyToReturn = totalOldQtyToReturn - oldUnitsReturnedCount;
                if (remainingOldQtyToReturn > 0) {
                    let oldProdId = oldItem.productId || oldItem.productSnapshot?.productId || oldItem.productSnapshot?._id;
                    if (oldProdId) {
                        const nonSerialUnits = await models_1.InventoryUnit.find({
                            productId: oldProdId,
                            soldInvoiceId: invoice._id,
                        })
                            .limit(remainingOldQtyToReturn)
                            .session(session);
                        for (const u of nonSerialUnits) {
                            oldCostPrice += u.purchasePrice || 0;
                            u.status = oldStatusTarget;
                            u.soldInvoiceId = undefined;
                            u.soldInvoiceCode = undefined;
                            u.soldAt = undefined;
                            if (!u.history)
                                u.history = [];
                            u.history.push({
                                action: 'ĐỔI_HÀNG_NHẬP_LẠI',
                                invoiceId: invoice._id,
                                invoiceCode: invoice.invoiceCode,
                                note: `Khách đổi sản phẩm không serial`,
                                date: now,
                            });
                            await u.save({ session });
                            oldUnitsReturnedCount++;
                        }
                        if (oldUnitsReturnedCount < totalOldQtyToReturn) {
                            const fallbackCost = Number(oldItem.productSnapshot?.costPrice) || (nonSerialUnits[0]?.purchasePrice) || 0;
                            oldCostPrice += fallbackCost * (totalOldQtyToReturn - oldUnitsReturnedCount);
                        }
                    }
                }
                // 2. Fetch and Lock NEW Replacement Item & Serial with Concurrency Control
                const newProd = await models_1.Product.findById(exReq.newProductId).session(session);
                if (!newProd) {
                    throw new product_service_1.AppError(`Sản phẩm mới (ID: ${exReq.newProductId}) không tồn tại`, 404);
                }
                let newUnitDoc = null;
                if (exReq.newSerialNumber && exReq.newSerialNumber.trim()) {
                    // Atomic update with status filter to prevent race conditions
                    newUnitDoc = await models_1.InventoryUnit.findOneAndUpdate({
                        serialNumber: exReq.newSerialNumber.trim(),
                        productId: newProd._id,
                        status: types_1.InventoryUnitStatus.AVAILABLE,
                    }, {
                        status: types_1.InventoryUnitStatus.SOLD,
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
                    }, { session, new: true });
                    if (!newUnitDoc) {
                        throw new product_service_1.AppError(`Serial "${exReq.newSerialNumber}" vừa được sử dụng hoặc không còn ở trạng thái sẵn sàng trong kho`, 400);
                    }
                }
                else {
                    // Select any available inventory unit for this product
                    newUnitDoc = await models_1.InventoryUnit.findOneAndUpdate({
                        productId: newProd._id,
                        status: types_1.InventoryUnitStatus.AVAILABLE,
                    }, {
                        status: types_1.InventoryUnitStatus.SOLD,
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
                    }, { session, new: true });
                    if (!newUnitDoc) {
                        throw new product_service_1.AppError(`Sản phẩm "${newProd.name}" hiện không còn đơn vị nào sẵn sàng trong kho`, 400);
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
                throw new product_service_1.AppError(`Số tiền giảm công nợ (${totalDebtReduction.toLocaleString('vi-VN')}đ) vượt quá công nợ còn lại của hóa đơn (${invoice.remainingAmount.toLocaleString('vi-VN')}đ)`, 400);
            }
            invoice.remainingAmount = Math.max(0, invoice.remainingAmount - totalDebtReduction + totalDebtAdded);
            invoice.totalPaid += totalPaidExtra;
            invoice.profit = Math.max(0, (invoice.profit || 0) + totalProfitAdjustment);
            // Invoice status update
            const allItemsCount = invoice.items.length;
            const exchangedCount = invoice.items.filter((i) => i.itemStatus === 'EXCHANGED').length;
            if (exchangedCount === allItemsCount) {
                invoice.status = types_1.InvoiceStatus.EXCHANGED;
            }
            else {
                invoice.status = types_1.InvoiceStatus.PARTIALLY_EXCHANGED;
            }
            // Transaction log
            const tx = new models_1.ReturnExchangeTransaction({
                transactionCode,
                invoiceId: invoice._id,
                invoiceCode: invoice.invoiceCode,
                customerId: invoice.customerId,
                customerName: invoice.customer?.name || 'Khách lẻ',
                type: types_1.ReturnExchangeType.EXCHANGE,
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
                invoice.items[exReq.order].returnExchangeTxId = tx._id;
            }
            // Recalculate exact totalCost and profit
            await recalculateInvoiceFinancials(invoice, session);
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
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            session.endSession();
        }
    }
}
exports.ReturnExchangeService = ReturnExchangeService;
/**
 * Deterministically recalculates active total cost and realized profit for an invoice,
 * taking into account all original line costs, returned items, and exchanged items.
 */
async function recalculateInvoiceFinancials(invoice, session) {
    let activeTotalCost = 0;
    let activeNetRevenue = 0;
    // Fetch all return & exchange transactions for this invoice
    const transactions = await models_1.ReturnExchangeTransaction.find({ invoiceId: invoice._id }).session(session || null).exec();
    // Fetch all units linked directly to this invoice (sold or reserved)
    const linkedUnits = await models_1.InventoryUnit.find({
        $or: [
            { soldInvoiceId: invoice._id },
            { reservedByInvoiceId: invoice._id },
        ],
    }).session(session || null).exec();
    const usedUnitIds = new Set();
    for (let idx = 0; idx < invoice.items.length; idx++) {
        const item = invoice.items[idx];
        const itemStatus = item.itemStatus || 'SOLD';
        const originalSalePrice = item.total !== undefined ? item.total : (item.unitPrice * item.quantity - (item.discount || 0));
        // Calculate actual cost for this item line (using InventoryUnit purchasePrice as highest priority!)
        let itemCostPrice = 0;
        const selectedSerials = (item.selectedSerials || []).filter((s) => s && s.trim());
        if (selectedSerials.length > 0) {
            const units = await models_1.InventoryUnit.find({ serialNumber: { $in: selectedSerials } }).session(session || null).exec();
            if (units.length > 0) {
                const foundUnitCost = units.reduce((sum, u) => {
                    usedUnitIds.add(u._id.toString());
                    return sum + (u.purchasePrice || 0);
                }, 0);
                const missingQty = Math.max(0, item.quantity - units.length);
                const fallbackUnitCost = Number(item.productSnapshot?.costPrice) || 0;
                itemCostPrice = foundUnitCost + (missingQty * fallbackUnitCost);
            }
            else {
                const fallbackUnitCost = Number(item.productSnapshot?.costPrice) || 0;
                itemCostPrice = fallbackUnitCost * item.quantity;
            }
        }
        else {
            let productId = item.productId || item.productSnapshot?.productId || item.productSnapshot?._id;
            let productCode = item.productSnapshot?.productCode;
            // Find units that were specifically sold/reserved for this invoice line
            const matchedUnits = linkedUnits.filter((u) => {
                if (usedUnitIds.has(u._id.toString()))
                    return false;
                const matchesId = productId && u.productId && u.productId.toString() === productId.toString();
                const matchesCode = productCode && u.productCode === productCode;
                return matchesId || matchesCode;
            });
            const requiredQty = item.quantity || 1;
            const unitsForThisItem = matchedUnits.slice(0, requiredQty);
            for (const u of unitsForThisItem) {
                usedUnitIds.add(u._id.toString());
            }
            if (unitsForThisItem.length > 0) {
                const foundCost = unitsForThisItem.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
                const missingQty = Math.max(0, requiredQty - unitsForThisItem.length);
                const fallbackUnitCost = Number(item.productSnapshot?.costPrice) || (unitsForThisItem[0]?.purchasePrice) || 0;
                itemCostPrice = foundCost + (missingQty * fallbackUnitCost);
            }
            else {
                // Fallback if no linked unit found in DB (e.g. invoice created before unit tracking)
                const fallbackUnitCost = Number(item.productSnapshot?.costPrice) || 0;
                itemCostPrice = fallbackUnitCost * requiredQty;
            }
        }
        if (itemStatus === 'SOLD') {
            activeTotalCost += itemCostPrice;
            activeNetRevenue += originalSalePrice;
        }
        else if (itemStatus === 'RETURNED') {
            // Returned item => Cost is 0 (returned to inventory). Revenue = retainedAmount
            const refundAmt = Number(item.refundAmount) || 0;
            const debtReduct = Number(item.debtReduction) || 0;
            const retainedAmt = item.retainedAmount !== undefined && item.retainedAmount !== null
                ? Number(item.retainedAmount)
                : Math.max(0, originalSalePrice - refundAmt - debtReduct);
            activeTotalCost += 0;
            activeNetRevenue += retainedAmt;
        }
        else if (itemStatus === 'EXCHANGED') {
            const ex = item.exchangedToItem;
            const newCostPrice = Number(ex?.costPrice) || 0;
            // Find exchange logs for this item order line
            let customerPaidExtra = 0;
            let cashRefund = 0;
            let debtReduction = 0;
            for (const tx of transactions) {
                if (tx.type === types_1.ReturnExchangeType.EXCHANGE && tx.exchangedItems) {
                    const exLog = tx.exchangedItems.find((e) => e.order === idx);
                    if (exLog) {
                        customerPaidExtra += Number(exLog.customerPaidExtra) || 0;
                        cashRefund += Number(exLog.cashRefund) || 0;
                        debtReduction += Number(exLog.debtReduction) || 0;
                    }
                }
            }
            activeTotalCost += newCostPrice;
            const effectiveNetRevenue = originalSalePrice + customerPaidExtra - cashRefund - debtReduction;
            activeNetRevenue += effectiveNetRevenue;
        }
    }
    // Factor in invoice-level discount (shipping fee is not included in goods profit)
    const finalGoodsRevenue = activeNetRevenue - (invoice.discount || 0);
    invoice.totalCost = Math.max(0, activeTotalCost);
    invoice.profit = finalGoodsRevenue - invoice.totalCost;
}
//# sourceMappingURL=returnExchange.service.js.map