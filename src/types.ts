export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  balance: number;
  createdAt: string;
  theme?: 'light' | 'dark';
  role?: 'user' | 'admin';
}

export type TransactionType = 'transfer' | 'deposit' | 'withdrawal';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: any; // Firestore Timestamp
  description?: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  reply?: string;
  timestamp: string;
  status: 'pending' | 'replied';
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
  icon: string;
}

export interface Investment {
  uid: string;
  totalInvested: number;
  currentValue: number;
  monthlyReturn: number;
  assets: { name: string; value: number; change: number }[];
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  method: string;
}
