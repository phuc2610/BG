"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
class QuoteRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Quote);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', status, startDate, endDate, } = query;
        const filter = {};
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { quoteCode: searchRegex },
                { 'customer.name': searchRegex },
                { 'customer.phone': searchRegex },
            ];
        }
        if (status)
            filter.status = status;
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (startDate || endDate) {
            filter.createdDate = {};
            if (startDate)
                filter.createdDate.$gte = new Date(startDate);
            if (endDate)
                filter.createdDate.$lte = new Date(endDate);
        }
        return this.findPaginated(filter, page, limit, sort, order);
    }
    async findByQuoteCode(quoteCode) {
        return this.findOne({ quoteCode });
    }
}
exports.QuoteRepository = QuoteRepository;
//# sourceMappingURL=quote.repository.js.map