import mongoose, { Document } from 'mongoose';
import { ISettings, IBenefitItem } from '../types';
export interface ISettingsDocument extends ISettings, Document {
}
export declare const DEFAULT_BENEFITS: IBenefitItem[];
export declare const Settings: mongoose.Model<ISettingsDocument, {}, {}, {}, mongoose.Document<unknown, {}, ISettingsDocument, {}, {}> & ISettingsDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Get or create global default settings
 */
export declare const getSettings: () => Promise<ISettingsDocument>;
//# sourceMappingURL=settings.model.d.ts.map