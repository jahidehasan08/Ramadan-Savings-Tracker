import { Timestamp } from './lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  isManual?: boolean;
  photoURL?: string | null;
  createdAt: Timestamp;
  isApproved: boolean;
  appRole: 'super_admin' | 'admin' | 'member';
}

export interface SavingsGroup {
  id: string;
  name: string;
  description?: string;
  goalAmount: number;
  targetDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  members: string[]; // List of user UIDs
  status: 'active' | 'completed' | 'cancelled';
  startDate?: Timestamp;
  endDate?: Timestamp;
  monthlyAmount: number;
  durationMonths?: number;
  previousYearBalancePerPerson?: number;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  isManual?: boolean;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Timestamp;
  targetMonthlyAmount?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
  date: Timestamp;
  userId: string;
  userName: string;
  createdBy: string;
  createdAt: Timestamp;
  forMonths?: string[];
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
