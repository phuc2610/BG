"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const mongoose_1 = __importDefault(require("mongoose"));
const clearDatabase = async () => {
    await (0, database_1.connectDB)();
    console.log('🧹 Clearing all products, inventory, quotes, counters...');
    await models_1.Product.deleteMany({});
    await models_1.Inventory.deleteMany({});
    await models_1.Quote.deleteMany({});
    await models_1.Counter.deleteMany({});
    let settings = await models_1.Settings.findOne();
    if (!settings) {
        await models_1.Settings.create({
            storeName: 'NP Computer',
            hotline: '0901.234.567',
            website: 'npcomputer.vn',
            facebook: 'facebook.com/npcomputer.official',
            address: '456 Lê Thanh Nghị, Hai Bà Trưng, Hà Nội',
            email: 'contact@npcomputer.vn',
            bankInfo: 'Ngân hàng MB Bank\nSTK: 0901234567\nChủ TK: CỬA HÀNG NP COMPUTER',
            terms: [
                'Sản phẩm linh kiện được bảo hành theo tem và serial number.',
                'Bảo hành 1 đổi 1 trong 7 ngày đầu nếu có lỗi phần cứng.',
                'Không bảo hành trường hợp rơi vỡ, vào nước, cháy nổ hoặc tem bị rách.',
                'Báo giá có giá trị trong vòng 7 ngày kể từ ngày lập.',
            ],
            footerText: 'Cảm ơn quý khách đã tin tưởng và chọn linh kiện tại NP Computer! 🙏',
        });
    }
    console.log('✅ Database completely cleared! Ready for fresh entries.');
    mongoose_1.default.connection.close();
};
clearDatabase().catch((err) => {
    console.error('❌ Clear DB error:', err);
    mongoose_1.default.connection.close();
});
//# sourceMappingURL=clear.js.map