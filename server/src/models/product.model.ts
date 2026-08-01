import mongoose, { Schema, Document } from 'mongoose';
import {
  ProductCategory,
  IProductImage,
  IProductSpecs,
} from '../types';

export interface IProductDocument extends Document {
  ownerId?: Schema.Types.ObjectId;
  productId: string;
  productCode: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  brand: string;
  modelName: string;
  description?: string;
  specs: IProductSpecs;
  images: IProductImage[];
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    order: { type: Number, default: 0 },
    isThumbnail: { type: Boolean, default: false },
  },
  { _id: true }
);

const productSpecsSchema = new Schema<IProductSpecs>(
  {
    cpu: String,
    mainboard: String,
    ram: String,
    ssd: String,
    hdd: String,
    vga: String,
    psu: String,
    case: String,
    cooler: String,
    windows: String,
    office: String,
    accessories: String,
    notes: String,
  },
  { _id: false }
);

const productSchema = new Schema<IProductDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productCode: {
      type: String,
      required: true,
    },
    barcode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(ProductCategory),
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    description: String,
    specs: {
      type: productSpecsSchema,
      default: () => ({}),
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ ownerId: 1, productCode: 1 }, { unique: true });
productSchema.index({ ownerId: 1, productId: 1 }, { unique: true });

productSchema.index({
  name: 'text',
  productCode: 'text',
  barcode: 'text',
  brand: 'text',
  modelName: 'text',
});

productSchema.virtual('model').get(function (this: any) {
  return this.modelName;
}).set(function (this: any, val: string) {
  this.modelName = val;
});

productSchema.virtual('thumbnailUrl').get(function (this: any) {
  const thumbnail = this.images?.find((img: any) => img.isThumbnail);
  if (thumbnail) return thumbnail.url;
  if (this.images?.length > 0) return this.images[0].url;
  return null;
});

export const Product = mongoose.model<IProductDocument>('Product', productSchema);
