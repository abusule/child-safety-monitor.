export interface LocationInfo {
  name: string;
  lat: number;
  lng: number;
  isSafe: boolean;
  timestamp: string;
}

export interface LocationHistoryEntry {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
  isSafeZone: boolean;
}

export interface AppConfig {
  id: string;
  name: string;
  icon: string;
  isBlocked: boolean;
  category: "Social" | "Games" | "Education" | "Entertainment";
  screenTimeLimit?: number; // optional limit per app in minutes
  screenTimeUsed: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: "web_search" | "web_visit" | "chat" | "app_usage" | "location";
  content: string;
  appOrSite?: string;
  isBlocked: boolean;
  blockReason?: string;
  severity: "info" | "warning" | "danger";
  aiAnalysis?: string;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "geofence" | "blocking" | "screentime" | "system";
  isRead: boolean;
}

export interface MonitorState {
  screenTimeLimit: number; // in minutes
  screenTimeUsed: number;  // in minutes
  bedtimeStart: string;    // "HH:MM"
  bedtimeEnd: string;      // "HH:MM"
  isDeviceLocked: boolean;
  currentLocation: LocationInfo;
  locationHistory: LocationHistoryEntry[];
  geofences: Geofence[];
  blockedCategories: string[]; // ["adult", "violence", "gambling", "bullying", "social_media"]
  blockedKeywords: string[];
  allowedApps: AppConfig[];
  activityLogs: ActivityLog[];
  notifications: AlertNotification[];
}

export interface AIAnalysisResult {
  blocked: boolean;
  category?: string;
  reason: string;
  severity: "info" | "warning" | "danger";
  summary: string;
}
