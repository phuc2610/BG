"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async findById(id) {
        return this.model.findById(id).exec();
    }
    async findOne(filter) {
        return this.model.findOne(filter).exec();
    }
    async findAll(filter = {}) {
        return this.model.find(filter).exec();
    }
    async findPaginated(filter, page = 1, limit = 20, sort = 'createdAt', order = 'desc') {
        const skip = (page - 1) * limit;
        const sortOption = { [sort]: order === 'asc' ? 1 : -1 };
        const [data, total] = await Promise.all([
            this.model.find(filter).sort(sortOption).skip(skip).limit(limit).exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async create(data) {
        const doc = new this.model(data);
        return doc.save();
    }
    async updateById(id, data) {
        return this.model
            .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
            .exec();
    }
    async deleteById(id) {
        return this.model.findByIdAndDelete(id).exec();
    }
    async count(filter = {}) {
        return this.model.countDocuments(filter).exec();
    }
    async aggregate(pipeline) {
        return this.model.aggregate(pipeline).exec();
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map