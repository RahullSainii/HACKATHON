export interface User {
  id: string;
  name: string;
  email: string;
  role: 'User' | 'Admin';
  phone?: string;
  address?: string;
  bio?: string;
}

export interface Complaint {
  _id: string;
  id: string; // Formatted ID like #001
  category: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Resolved';
  date: string;
  userId: string | Partial<User> | null;
  createdAt: string;
  updatedAt: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrls?: string[];
  videoUrls?: string[];
  isAnonymous?: boolean;
  handledBy?: string;
  reportedBy?: string;
  attachmentCount?: number;
  verificationCount?: number;
  verifiedBy?: string[];
  verifiedAt?: string | null;
  aiCategorySuggestion?: {
    category: string;
    confidence: number;
    reason: string;
    source: 'heuristic' | 'openai' | 'none';
  };
  attachments?: {
    name: string;
    type: string;
    size: number;
    data: string;
  }[];
  moderation?: {
    status: 'clean' | 'flagged' | 'blocked';
    spamScore: number;
    abusiveScore: number;
    duplicateScore: number;
    reasons: string[];
    duplicateComplaintIds: string[];
    detectedAt: string | null;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface ComplaintResponse {
  success: boolean;
  count?: number;
  data: Complaint | Complaint[];
}

export interface Stats {
  total: number;
  pending: number;
  resolved: number;
  resolvedThisMonth?: number;
  verifiedIssues?: number;
  communityImpactScore?: number;
  categoryDistribution: {
    labels: string[];
    data: number[];
  };
  statusDistribution: {
    labels: string[];
    data: number[];
  };
  responseTimeTrend?: {
    day: string;
    avgHours: number;
    count: number;
  }[];
  activeZones?: {
    location: string;
    count: number;
    open: number;
  }[];
  leaderboard?: {
    rank: number;
    name: string;
    email: string;
    points: number;
    reportsSubmitted: number;
    verificationsGiven: number;
    badges: string[];
  }[];
}
