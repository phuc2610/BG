import mongoose, { Document } from 'mongoose';
export declare enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}
export declare enum UserStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    BLOCKED = "BLOCKED"
}
export interface IUserDocument extends Document {
    username: string;
    usernameNormalized: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    isActive: boolean;
    registeredAt: Date;
    activatedAt?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: mongoose.Model<IUserDocument, {}, {}, {}, mongoose.Document<unknown, {}, IUserDocument, {}, {}> & IUserDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=user.model.d.ts.map