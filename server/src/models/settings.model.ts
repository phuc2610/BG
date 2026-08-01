import mongoose, { Schema, Document } from 'mongoose';
import { ISettings } from '../types';

export interface ISettingsDocument extends ISettings, Document {
  ownerId?: Schema.Types.ObjectId;
}

const settingsSchema = new Schema<ISettingsDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    storeName: { type: String, default: 'NP Computer' },
    hotline: { type: String, default: '0123.456.789' },
    website: { type: String, default: '' },
    facebook: { type: String, default: '' },
    address: { type: String, default: '' },
    email: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    qrPaymentUrl: { type: String, default: '' },
    qrPaymentPublicId: { type: String, default: '' },
    bankInfo: { type: String, default: '' },
    terms: {
      type: [String],
      default: [
        'Sản phẩm được bảo hành theo thời gian ghi trên báo giá.',
        'Bảo hành 1 đổi 1 trong 7 ngày đầu nếu lỗi do nhà sản xuất.',
        'Không bảo hành các trường hợp: rơi vỡ, vào nước, tự ý tháo lắp.',
        'Giá có thể thay đổi mà không báo trước.',
        'Báo giá có hiệu lực trong 7 ngày kể từ ngày lập.',
      ],
    },
    footerText: {
      type: String,
      default: 'Cảm ơn quý khách đã tin tưởng và lựa chọn NP Computer! 🙏',
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettingsDocument>('Settings', settingsSchema);

/**
 * Get or create default settings per owner
 */
export const getSettings = async (ownerId?: any): Promise<ISettingsDocument> => {
  const filter: any = {};
  if (ownerId) filter.ownerId = ownerId;

  let settings = await Settings.findOne(filter);
  if (!settings) {
    settings = await Settings.create(filter);
  }
  return settings;
};
