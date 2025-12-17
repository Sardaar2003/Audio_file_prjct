export type Role = 'User' | 'Agent' | 'QA1' | 'QA2' | 'Monitor' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface FilePair {
  _id: string;
  baseName: string;
  audioS3Key?: string;
  textS3Key?: string;
  audioAvailable?: boolean;
  textAvailable?: boolean;
  uploaderName: string;
  agentTag?: string;
  status: 'Processing' | 'Completed';
  soldStatus: 'Sold' | 'Unsold';
  uploadedAt: string;
  completedAt?: string;
  comments?: RecordComment[];
}

export interface RecordComment {
  _id?: string;
  author?: string;
  authorName?: string;
  role?: Role | string;
  message: string;
  createdAt: string;
}

export interface UploadSummary {
  totalFiles: number;
  uniqueFilenames: number;
  uploadedRecords: number;
  fullyMapped: number;
  audioOnly: number;
  textOnly: number;
}

export interface Assignment {
  _id: string;
  filePair: FilePair;
  assignedByName: string;
  assignedToName: string;
  teamTag: 'QA1' | 'QA2';
  assignedAt: string;
  status: 'Assigned' | 'Completed';
}

export interface Review {
  _id: string;
  reviewerName: string;
  teamTag: 'QA1' | 'QA2';
  soldStatus: 'Sold' | 'Unsold';
  status: 'Pending' | 'OK' | 'Issue';
  comment: string;
  reviewedAt: string;
  filePair: FilePair;
  assignedManagerName?: string;
}

export interface AdminStats {
  analytics: {
    totalUsers: number;
    totalFilePairs: number;
    processingCount: number;
    completedReviews: number;
  };
  uploads: FilePair[];
  assignments: Assignment[];
  reviews: Review[];
}


