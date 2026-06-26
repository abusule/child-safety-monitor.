import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { MonitorState, ActivityLog, AlertNotification, LocationInfo, AIAnalysisResult } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
const isGeminiEnabled = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && isGeminiEnabled) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Successfully initialized GoogleGenAI client on server.");
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return aiClient;
}

// In-Memory Database for demonstration and real-time parent-child synchronization
let state: MonitorState = {
  screenTimeLimit: 120, // 2 hours
  screenTimeUsed: 35,   // 35 minutes used
  bedtimeStart: "21:00",
  bedtimeEnd: "07:00",
  isDeviceLocked: false,
  currentLocation: {
    name: "Home",
    lat: 37.7749,
    lng: -122.4194,
    isSafe: true,
    timestamp: new Date().toISOString(),
  },
  locationHistory: [
    { id: "h1", name: "School", lat: 37.7891, lng: -122.4014, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: "h2", name: "Local Park", lat: 37.7699, lng: -122.4468, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
    { id: "h3", name: "Home", lat: 37.7749, lng: -122.4194, timestamp: new Date(Date.now() - 1200000).toISOString() }
  ],
  geofences: [
    { id: "geo1", name: "Home Perimeter", lat: 37.7749, lng: -122.4194, radius: 150, isSafeZone: true },
    { id: "geo2", name: "School Area", lat: 37.7891, lng: -122.4014, radius: 200, isSafeZone: true },
    { id: "geo3", name: "Local Park", lat: 37.7699, lng: -122.4468, radius: 250, isSafeZone: true }
  ],
  blockedCategories: ["adult", "violence", "gambling", "bullying"],
  blockedKeywords: ["buy weapon", "how to hack", "dark web", "cheat in exams"],
  allowedApps: [
    { id: "app1", name: "YouTube Kids", icon: "Youtube", isBlocked: false, category: "Entertainment", screenTimeUsed: 15 },
    { id: "app2", name: "Minecraft", icon: "Gamepad", isBlocked: false, category: "Games", screenTimeUsed: 15 },
    { id: "app3", name: "Duolingo", icon: "BookOpen", isBlocked: false, category: "Education", screenTimeUsed: 5 },
    { id: "app4", name: "TikTok Kids", icon: "MessageSquare", isBlocked: true, category: "Social", screenTimeUsed: 0 }
  ],
  activityLogs: [
    {
      id: "log1",
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      type: "web_visit",
      content: "Opened Wikipedia page on Moon exploration",
      appOrSite: "wikipedia.org",
      isBlocked: false,
      severity: "info"
    },
    {
      id: "log2",
      timestamp: new Date(Date.now() - 4800000).toISOString(),
      type: "web_search",
      content: "how to solve quadratic equations",
      isBlocked: false,
      severity: "info"
    },
    {
      id: "log3",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: "web_search",
      content: "play intense gun shooting games free unblocked",
      isBlocked: true,
      blockReason: "Contains violent weapon query and unblocked game request",
      severity: "danger",
      aiAnalysis: "AI flagged this query because it matches the configured 'violence' restrictions and attempts to bypass schools filters."
    },
    {
      id: "log4",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      type: "chat",
      content: "Simulated chat: Hey, let's do the homework together!",
      appOrSite: "Safe Chat",
      isBlocked: false,
      severity: "info"
    }
  ],
  notifications: [
    {
      id: "n1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      title: "Content Blocked Alert",
      message: "Blocked search query 'play intense gun shooting games free unblocked' on Chrome.",
      type: "blocking",
      isRead: false
    },
    {
      id: "n2",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      title: "Safe Zone Exit",
      message: "Child exited 'School Area' safe boundary.",
      type: "geofence",
      isRead: true
    }
  ]
};

// Heuristic fallback filter when Gemini API is disabled
function runFallbackContentFilter(text: string, categories: string[], customKeywords: string[]): AIAnalysisResult {
  const normalizedText = text.toLowerCase();

  // Check custom keywords first
  for (const keyword of customKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return {
        blocked: true,
        category: "Custom Blocklist",
        reason: `Matched custom blocked keyword: "${keyword}"`,
        severity: "danger",
        summary: `Blocked due to custom keyword match.`
      };
    }
  }

  // Categories mapping
  const flags = {
    adult: ["porn", "adult", "sexy", "18+", "nsfw", "xxx", "gamble", "betting"],
    violence: ["weapon", "kill", "fight", "gun", "shoot", "murder", "blood", "stab"],
    gambling: ["casino", "slot machine", "lottery", "poker", "jackpot", "betting"],
    bullying: ["loser", "hate you", "stupid", "ugly", "shut up", "fat", "die", "kill yourself"],
    social_media: ["tiktok", "instagram", "facebook", "snapchat", "reddit", "twitter", "x.com"]
  };

  for (const category of categories) {
    const keywords = flags[category as keyof typeof flags];
    if (keywords) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          return {
            blocked: true,
            category: category.toUpperCase(),
            reason: `Matched restricted term "${keyword}" in category [${category}]`,
            severity: "danger",
            summary: `Content flagged under parental rule [${category}].`
          };
        }
      }
    }
  }

  return {
    blocked: false,
    reason: "Safe content - no local match rules triggered.",
    severity: "info",
    summary: "Content passed local heuristic verification."
  };
}

// Distance utility (Haversine approximation)
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// API: Get State
app.get("/api/state", (req, res) => {
  res.json({ ...state, isGeminiEnabled });
});

// API: Update Rules
app.post("/api/state/update-rules", (req, res) => {
  const { screenTimeLimit, bedtimeStart, bedtimeEnd, blockedCategories, blockedKeywords } = req.body;
  
  if (typeof screenTimeLimit === "number") state.screenTimeLimit = screenTimeLimit;
  if (bedtimeStart) state.bedtimeStart = bedtimeStart;
  if (bedtimeEnd) state.bedtimeEnd = bedtimeEnd;
  if (Array.isArray(blockedCategories)) state.blockedCategories = blockedCategories;
  if (Array.isArray(blockedKeywords)) state.blockedKeywords = blockedKeywords;

  // Log update
  const newLog: ActivityLog = {
    id: `log_sys_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "app_usage",
    content: "Parent updated monitoring rules & configurations",
    isBlocked: false,
    severity: "info"
  };
  state.activityLogs.unshift(newLog);

  res.json({ success: true, state });
});

// API: Remote Lock
app.post("/api/state/lock-device", (req, res) => {
  const { isLocked } = req.body;
  state.isDeviceLocked = !!isLocked;

  // Add Log
  const newLog: ActivityLog = {
    id: `log_lock_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "app_usage",
    content: `Parent remotely ${state.isDeviceLocked ? "LOCKED" : "UNLOCKED"} the child's device`,
    isBlocked: false,
    severity: state.isDeviceLocked ? "warning" : "info"
  };
  state.activityLogs.unshift(newLog);

  // Add Notification
  const newNotification: AlertNotification = {
    id: `n_lock_${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: state.isDeviceLocked ? "Device Remotely Locked" : "Device Remotely Unlocked",
    message: `Your command to ${state.isDeviceLocked ? "lock" : "unlock"} the child's device was successfully executed in real time.`,
    type: "system",
    isRead: false
  };
  state.notifications.unshift(newNotification);

  res.json({ success: true, state });
});

// API: Tick screen time
app.post("/api/state/tick-screentime", (req, res) => {
  if (state.screenTimeUsed < state.screenTimeLimit) {
    state.screenTimeUsed += 1;
    
    // Check if limit reached
    if (state.screenTimeUsed >= state.screenTimeLimit) {
      const alertNotification: AlertNotification = {
        id: `n_screentime_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Screen Time Exceeded",
        message: `Child has reached the daily limit of ${state.screenTimeLimit} minutes. Access to apps has been auto-restricted.`,
        type: "screentime",
        isRead: false
      };
      state.notifications.unshift(alertNotification);

      const alertLog: ActivityLog = {
        id: `log_screentime_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "app_usage",
        content: "Daily screen time limit reached. Standard apps locked.",
        isBlocked: true,
        severity: "danger"
      };
      state.activityLogs.unshift(alertLog);
    }
  }
  res.json({ success: true, state });
});

// API: Reset screen time
app.post("/api/state/reset-screentime", (req, res) => {
  state.screenTimeUsed = 0;
  
  const alertLog: ActivityLog = {
    id: `log_screentime_reset_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "app_usage",
    content: "Parent reset daily screen time counter.",
    isBlocked: false,
    severity: "info"
  };
  state.activityLogs.unshift(alertLog);

  res.json({ success: true, state });
});

// API: Simulate Activity (Search / Web / Chat) with Real-Time Gemini content analysis
app.post("/api/state/simulate-activity", async (req, res) => {
  const { type, content, appOrSite } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  let filterResult: AIAnalysisResult;

  if (isGeminiEnabled) {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        throw new Error("Gemini AI client not ready.");
      }

      const prompt = `
        You are a highly sensitive parent monitoring and protective content filter backend.
        Analyze the following text or activity to determine if it should be BLOCKED for a child.
        
        Active Blocked Categories: ${state.blockedCategories.join(", ")}
        Custom Blocked Keywords: ${state.blockedKeywords.join(", ")}

        Child's activity type: ${type}
        Target platform/domain: ${appOrSite || "N/A"}
        Text content to analyze: "${content}"

        CRITERIA FOR BLOCKING:
        1. Explicit adult/sexual materials, porn, or dating.
        2. Violence, weapons, instructions for self-harm, instructions for criminality.
        3. Gambling, real-money betting, casino references.
        4. Cyberbullying, hate speech, severe insults, extreme profanity, encouragement of self-harm.
        5. Matches with any Custom Blocked Keywords or their semantic equivalents.
        6. Social media sites if "social_media" is in blocked categories.

        Return your analysis strictly matching the requested JSON Schema. Keep explanations brief and reassuring for parent dashboards.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blocked: {
                type: Type.BOOLEAN,
                description: "True if content violates parent guidelines or matches blocklists"
              },
              category: {
                type: Type.STRING,
                description: "The matching rule or category flagged (e.g. ADULT, VIOLENCE, GAMBLING, BULLYING, CUSTOM)"
              },
              reason: {
                type: Type.STRING,
                description: "Direct explanation of why it was flagged or why it is safe."
              },
              severity: {
                type: Type.STRING,
                description: "danger (if blocked), warning (if borderline/flagged), info (if clean)"
              },
              summary: {
                type: Type.STRING,
                description: "A short 1-sentence scannable breakdown of the text classification."
              }
            },
            required: ["blocked", "reason", "severity", "summary"]
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      filterResult = {
        blocked: !!parsed.blocked,
        category: parsed.category || "General Content Filter",
        reason: parsed.reason || "Filtered by child-safety AI",
        severity: parsed.severity || (parsed.blocked ? "danger" : "info"),
        summary: parsed.summary || "Analyzed by Gemini AI."
      };
    } catch (e) {
      console.error("Gemini analysis error, falling back to heuristics:", e);
      filterResult = runFallbackContentFilter(content, state.blockedCategories, state.blockedKeywords);
      filterResult.summary = "[Heuristic Fallback] " + filterResult.summary;
    }
  } else {
    // Run rule-based heuristic filter directly
    filterResult = runFallbackContentFilter(content, state.blockedCategories, state.blockedKeywords);
  }

  // Record Activity Log
  const logId = `log_${Date.now()}`;
  const newLog: ActivityLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    type,
    content,
    appOrSite,
    isBlocked: filterResult.blocked,
    blockReason: filterResult.blocked ? `${filterResult.category}: ${filterResult.reason}` : undefined,
    severity: filterResult.severity,
    aiAnalysis: filterResult.blocked ? filterResult.summary : undefined
  };
  state.activityLogs.unshift(newLog);

  // If blocked, generate a parent alert notification immediately
  if (filterResult.blocked) {
    const alertNotif: AlertNotification = {
      id: `n_block_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: `Content Blocked [${filterResult.category || "Filter"}]`,
      message: `Child attempted ${type === "web_search" ? "search" : type === "chat" ? "sending chat" : "visiting site"} containing restricted content: "${content.substring(0, 50)}". Intercepted in real time.`,
      type: "blocking",
      isRead: false
    };
    state.notifications.unshift(alertNotif);
  }

  res.json({
    success: true,
    state,
    decision: {
      blocked: filterResult.blocked,
      reason: filterResult.reason,
      category: filterResult.category,
      summary: filterResult.summary
    }
  });
});

// API: Simulate Location Change with geofencing analysis
app.post("/api/state/simulate-location", (req, res) => {
  const { name, lat, lng } = req.body;

  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Name, lat, and lng are required" });
  }

  // 1. Identify geofences matched
  let insideSafeZone = false;
  let triggeredGeofenceName = "";

  for (const fence of state.geofences) {
    const distance = getDistanceInMeters(lat, lng, fence.lat, fence.lng);
    if (distance <= fence.radius) {
      if (fence.isSafeZone) {
        insideSafeZone = true;
        triggeredGeofenceName = fence.name;
      }
    }
  }

  // Special coordinate mapping for known test regions to flag unmapped danger zones
  const isSafe = insideSafeZone || name === "Home" || name === "School" || name === "Local Park";

  // Create new location object
  const newLoc: LocationInfo = {
    name,
    lat,
    lng,
    isSafe,
    timestamp: new Date().toISOString()
  };

  const oldLocationName = state.currentLocation.name;
  state.currentLocation = newLoc;

  // Add to history
  state.locationHistory.unshift({
    id: `lh_${Date.now()}`,
    name,
    lat,
    lng,
    timestamp: new Date().toISOString()
  });

  // Limit history length to 20
  if (state.locationHistory.length > 20) {
    state.locationHistory.pop();
  }

  // 2. Generate notification on location change / safety transition
  if (oldLocationName !== name) {
    const locationLog: ActivityLog = {
      id: `log_loc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "location",
      content: `Location changed from ${oldLocationName} to ${name}`,
      isBlocked: !isSafe,
      severity: isSafe ? "info" : "warning"
    };
    state.activityLogs.unshift(locationLog);

    if (!isSafe) {
      const boundaryAlert: AlertNotification = {
        id: `n_geo_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Unsafe Zone Boundary Alert",
        message: `Child entered unapproved / potentially unsafe area: "${name}". Check live location.`,
        type: "geofence",
        isRead: false
      };
      state.notifications.unshift(boundaryAlert);
    } else {
      const geofenceAlert: AlertNotification = {
        id: `n_geo_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Geofence Safety Log",
        message: `Child arrived safely at designated safe zone: "${name}" (${triggeredGeofenceName || "Designated Safe Zone"}).`,
        type: "geofence",
        isRead: true
      };
      state.notifications.unshift(geofenceAlert);
    }
  }

  res.json({ success: true, state });
});

// API: Toggle individual app blocks
app.post("/api/state/toggle-app-block", (req, res) => {
  const { appId, isBlocked } = req.body;
  
  const appIndex = state.allowedApps.findIndex(a => a.id === appId);
  if (appIndex !== -1) {
    state.allowedApps[appIndex].isBlocked = !!isBlocked;

    const newLog: ActivityLog = {
      id: `log_app_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "app_usage",
      content: `Parent remotely ${isBlocked ? "BLOCKED" : "UNBLOCKED"} access to the app "${state.allowedApps[appIndex].name}"`,
      isBlocked: false,
      severity: "info"
    };
    state.activityLogs.unshift(newLog);
  }

  res.json({ success: true, state });
});

// API: Add custom keyword
app.post("/api/state/add-keyword", (req, res) => {
  const { keyword } = req.body;
  if (keyword && !state.blockedKeywords.includes(keyword)) {
    state.blockedKeywords.push(keyword);
  }
  res.json({ success: true, state });
});

// API: Remove custom keyword
app.post("/api/state/remove-keyword", (req, res) => {
  const { keyword } = req.body;
  state.blockedKeywords = state.blockedKeywords.filter(k => k !== keyword);
  res.json({ success: true, state });
});

// API: Clear Notifications
app.post("/api/state/clear-notifications", (req, res) => {
  state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
  res.json({ success: true, state });
});

// API: Reset Sandbox State to Factory Defaults
app.post("/api/state/reset", (req, res) => {
  state = {
    screenTimeLimit: 120,
    screenTimeUsed: 35,
    bedtimeStart: "21:00",
    bedtimeEnd: "07:00",
    isDeviceLocked: false,
    currentLocation: {
      name: "Home",
      lat: 37.7749,
      lng: -122.4194,
      isSafe: true,
      timestamp: new Date().toISOString(),
    },
    locationHistory: [
      { id: "h1", name: "School", lat: 37.7891, lng: -122.4014, timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
      { id: "h2", name: "Local Park", lat: 37.7699, lng: -122.4468, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
      { id: "h3", name: "Home", lat: 37.7749, lng: -122.4194, timestamp: new Date(Date.now() - 1200000).toISOString() }
    ],
    geofences: [
      { id: "geo1", name: "Home Perimeter", lat: 37.7749, lng: -122.4194, radius: 150, isSafeZone: true },
      { id: "geo2", name: "School Area", lat: 37.7891, lng: -122.4014, radius: 200, isSafeZone: true },
      { id: "geo3", name: "Local Park", lat: 37.7699, lng: -122.4468, radius: 250, isSafeZone: true }
    ],
    blockedCategories: ["adult", "violence", "gambling", "bullying"],
    blockedKeywords: ["buy weapon", "how to hack", "dark web", "cheat in exams"],
    allowedApps: [
      { id: "app1", name: "YouTube Kids", icon: "Youtube", isBlocked: false, category: "Entertainment", screenTimeUsed: 15 },
      { id: "app2", name: "Minecraft", icon: "Gamepad", isBlocked: false, category: "Games", screenTimeUsed: 15 },
      { id: "app3", name: "Duolingo", icon: "BookOpen", isBlocked: false, category: "Education", screenTimeUsed: 5 },
      { id: "app4", name: "TikTok Kids", icon: "MessageSquare", isBlocked: true, category: "Social", screenTimeUsed: 0 }
    ],
    activityLogs: [
      {
        id: "log_init",
        timestamp: new Date().toISOString(),
        type: "app_usage",
        content: "Sandbox state reset by user",
        isBlocked: false,
        severity: "info"
      }
    ],
    notifications: []
  };
  res.json({ success: true, state });
});

// Mount Vite middleware / static build pipeline
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Child Safety Monitor backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

