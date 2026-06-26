import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Smartphone,
  Search,
  MessageSquare,
  MapPin,
  Clock,
  Lock,
  Unlock,
  Settings,
  Activity,
  Bell,
  Plus,
  Trash2,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Send,
  Globe,
  Sparkles,
  Map,
  Info,
  Layers,
  Sliders,
  Play,
  RotateCcw,
  VolumeX,
  ShieldCheck,
  Check
} from "lucide-react";
import { MonitorState, ActivityLog, AlertNotification, AppConfig, LocationInfo } from "./types";

export default function App() {
  // Global Monitoring State
  const [state, setState] = useState<MonitorState | null>(null);
  const [isGeminiEnabled, setIsGeminiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "apps" | "logs">("overview");
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>("all");
  
  // Child Device Simulator State
  const [activePhoneApp, setActivePhoneApp] = useState<"home" | "browser" | "chat" | "gps">("home");
  const [browserInput, setBrowserInput] = useState("");
  const [browserSearchPresets] = useState([
    { label: "Safe: Science Homework", text: "how to solve a math fraction" },
    { label: "Safe: Puppies", text: "cute puppy playing with a ball" },
    { label: "Block: Weapon Purchase", text: "buy tactical pocket knife illegally", cat: "VIOLENCE" },
    { label: "Block: Gambling Info", text: "best online gambling betting tips", cat: "GAMBLING" },
    { label: "Block: Mature Search", text: "naughty adult video search unblocked", cat: "ADULT" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: "child" | "leo" | "system"; text: string; blocked?: boolean }[]>([
    { sender: "leo", text: "Hey! Do you want to play Minecraft later?" },
    { sender: "child", text: "Yes! Let me check how much screen time I have." }
  ]);
  const [chatPresets] = useState([
    { label: "Safe Message", text: "I finished my geography homework!" },
    { label: "Bullying Message", text: "You are a stupid loser and nobody likes you, go away!" }
  ]);
  const [isSimulatingBedtime, setIsSimulatingBedtime] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [browserResult, setBrowserResult] = useState<{ title: string; content: string; blocked: boolean; reason?: string } | null>(null);

  // Phone notification state
  const [phoneNotification, setPhoneNotification] = useState<{ message: string; type: "success" | "warning" } | null>(null);

  const showPhoneNotification = (message: string, type: "success" | "warning" = "success") => {
    setPhoneNotification({ message, type });
  };

  // Parent Custom Keyword Input State
  const [newKeywordInput, setNewKeywordInput] = useState("");

  // Map Coordinates Mapping for the Visual Radar View
  const mapPoints = {
    "Home": { x: 250, y: 220, lat: 37.7749, lng: -122.4194, isSafe: true },
    "School": { x: 380, y: 110, lat: 37.7891, lng: -122.4014, isSafe: true },
    "Local Park": { x: 120, y: 150, lat: 37.7699, lng: -122.4468, isSafe: true },
    "The Mall": { x: 350, y: 310, lat: 37.7820, lng: -122.4110, isSafe: true },
    "Unsafe Alleyway": { x: 140, y: 340, lat: 37.7550, lng: -122.4250, isSafe: false }
  };

  // Fetch parent and child sync state
  const fetchState = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setIsGeminiEnabled(data.isGeminiEnabled);
      }
    } catch (e) {
      console.error("Error synchronizing monitoring state:", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll state every 3 seconds for real-time demonstration
  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetchState(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Screen Time ticker simulator (every 1 minute in real-time, tick 1 minute on screen time used)
  useEffect(() => {
    const timer = setInterval(async () => {
      if (state && !state.isDeviceLocked && !isSimulatingBedtime && state.screenTimeUsed < state.screenTimeLimit) {
        try {
          const res = await fetch("/api/state/tick-screentime", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setState(data.state);
          }
        } catch (e) {
          console.error("Error ticking screen time:", e);
        }
      }
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [state, isSimulatingBedtime]);

  // Auto-dismiss phone notifications
  useEffect(() => {
    if (phoneNotification) {
      const timer = setTimeout(() => {
        setPhoneNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [phoneNotification]);

  // Handle Parent Lock Action
  const toggleRemoteLock = async (lockState: boolean) => {
    try {
      const res = await fetch("/api/state/lock-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: lockState })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Lock error:", e);
    }
  };

  // Handle Screen Time Limit Adjustments
  const handleUpdateRules = async (updatedFields: Partial<MonitorState>) => {
    if (!state) return;
    const body = {
      screenTimeLimit: updatedFields.screenTimeLimit ?? state.screenTimeLimit,
      bedtimeStart: updatedFields.bedtimeStart ?? state.bedtimeStart,
      bedtimeEnd: updatedFields.bedtimeEnd ?? state.bedtimeEnd,
      blockedCategories: updatedFields.blockedCategories ?? state.blockedCategories,
      blockedKeywords: updatedFields.blockedKeywords ?? state.blockedKeywords
    };
    try {
      const res = await fetch("/api/state/update-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Rule update error:", e);
    }
  };

  // Add Custom keyword
  const handleAddKeyword = async () => {
    if (!newKeywordInput.trim()) return;
    try {
      const res = await fetch("/api/state/add-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeywordInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setNewKeywordInput("");
      }
    } catch (e) {
      console.error("Error adding keyword:", e);
    }
  };

  // Remove Custom keyword
  const handleRemoveKeyword = async (word: string) => {
    try {
      const res = await fetch("/api/state/remove-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: word })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Error removing keyword:", e);
    }
  };

  // Toggle app block
  const handleToggleAppBlock = async (appId: string, isBlocked: boolean) => {
    try {
      const res = await fetch("/api/state/toggle-app-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, isBlocked })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("App toggle block error:", e);
    }
  };

  // Simulate screen time reset (Manual intervention for demo)
  const handleResetScreenTime = async () => {
    try {
      const res = await fetch("/api/state/reset-screentime", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Error resetting screen time:", e);
    }
  };

  // Trigger State Reset
  const handleResetSandbox = async () => {
    if (!confirm("Are you sure you want to reset the simulation state to initial defaults?")) return;
    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setActivePhoneApp("home");
        setBrowserResult(null);
        setBrowserInput("");
        setChatHistory([
          { sender: "leo", text: "Hey! Do you want to play Minecraft later?" },
          { sender: "child", text: "Yes! Let me check how much screen time I have." }
        ]);
      }
    } catch (e) {
      console.error("Reset error:", e);
    }
  };

  // --- CHILD DEVICE SIMULATOR ACTIONS ---

  // Child changes location
  const handleSimulateLocation = async (placeName: keyof typeof mapPoints) => {
    const point = mapPoints[placeName];
    try {
      const res = await fetch("/api/state/simulate-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: placeName, lat: point.lat, lng: point.lng })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Location simulation error:", e);
    }
  };

  // Child searches/browses content
  const handleBrowserSubmit = async (customText?: string) => {
    const query = customText || browserInput;
    if (!query.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/state/simulate-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "web_search",
          content: query,
          appOrSite: "Chrome Browser"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        const blocked = data.decision.blocked;
        if (blocked) {
          setBrowserResult({
            title: "Access Restricted",
            content: data.decision.reason,
            blocked: true,
            reason: `Rule Category: ${data.decision.category || "General Safety Policy"}`
          });
        } else {
          setBrowserResult({
            title: `Search: "${query}"`,
            content: `Safe content verified by parent AI shield. Loading standard educational search results and safe articles matching "${query}". No threats detected.`,
            blocked: false
          });
        }
      }
    } catch (e) {
      console.error("Browser submission error:", e);
    } finally {
      setIsAnalyzing(false);
      setBrowserInput("");
    }
  };

  // Child chat submit
  const handleChatSubmit = async (customText?: string) => {
    const messageText = customText || chatInput;
    if (!messageText.trim()) return;

    setChatHistory(prev => [...prev, { sender: "child", text: messageText }]);
    setChatInput("");
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/state/simulate-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          content: messageText,
          appOrSite: "Safe Chat App"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        const blocked = data.decision.blocked;
        if (blocked) {
          setChatHistory(prev => [
            ...prev,
            { sender: "system", text: `⚠️ Message blocked under category [${data.decision.category}]: Be respectful and safe online. Flagged alert sent to Parent Guardian.`, blocked: true }
          ]);
        } else {
          // Leo replies with positive AI response
          setTimeout(() => {
            setChatHistory(prev => [
              ...prev,
              { sender: "leo", text: "Cool! Let's do that. That sounds great! 👍" }
            ]);
          }, 1000);
        }
      }
    } catch (e) {
      console.error("Chat intercept error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAlerts = async () => {
    try {
      const res = await fetch("/api/state/clear-notifications", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (e) {
      console.error("Error clearing alerts:", e);
    }
  };

  // Determine if child device is currently blocked / locked out
  const isDeviceLockedOut = () => {
    if (!state) return false;
    if (state.isDeviceLocked) return "remote_lock";
    if (isSimulatingBedtime) return "bedtime";
    if (state.screenTimeUsed >= state.screenTimeLimit) return "screentime";
    return null;
  };

  const lockReason = isDeviceLockedOut();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Header Banner */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/10">
              <Shield className="w-6 h-6 text-white stroke-[2.5]" id="shield-logo" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Child Safety Monitor
                <span className="text-[10px] uppercase tracking-widest bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  Full Stack Sandbox
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Interactive real-time guardian oversight, content interceptor and location geofencing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time AI Shield Status indicator */}
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${isGeminiEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">CONTENT AI SHIELD</div>
                <div className="text-xs font-semibold text-slate-800">
                  {isGeminiEnabled ? "Gemini 3.5 Active" : "Heuristic Fallback Mode"}
                </div>
              </div>
            </div>

            <button
              onClick={handleResetSandbox}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-1 text-xs font-medium shadow-sm"
              title="Reset Sandbox State"
              id="reset-sandbox-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {isLoading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">Spinning up full-stack safety engines...</p>
          </div>
        ) : !state ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500" />
            <h3 className="text-lg font-bold text-slate-900">Unable to Sync State</h3>
            <p className="text-slate-500 text-sm max-w-md">
              There was an issue loading the shared guardian environment. Please restart the developer server.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: PARENT/GUARDIAN OVERVIEW DASHBOARD */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="guardian-dashboard">
              {/* Dashboard Ribbon Navigation */}
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PARENT CONTROLLER</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-500 font-medium">Remote Dashboard</span>
                </div>
                
                {/* Tab Switchers */}
                <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                  {(["overview", "rules", "apps", "logs"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 text-xs rounded-full transition-all capitalize font-semibold ${
                        activeTab === tab
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                      id={`tab-parent-${tab}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB CONTENT: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="p-6 space-y-6">
                  {/* Status Indicator Bento Blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Screen Time Bento Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <span>Daily Screen Time</span>
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="my-2.5">
                        <div className="text-xl font-bold text-slate-900 font-mono">
                          {state.screenTimeUsed} <span className="text-xs text-slate-500">/ {state.screenTimeLimit} m</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              state.screenTimeUsed >= state.screenTimeLimit
                                ? "bg-rose-500"
                                : state.screenTimeUsed / state.screenTimeLimit > 0.8
                                ? "bg-amber-500"
                                : "bg-indigo-600"
                            }`}
                            style={{ width: `${Math.min(100, (state.screenTimeUsed / state.screenTimeLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleResetScreenTime}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-0.5"
                          id="btn-reset-screentime"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Reset Today
                        </button>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {state.screenTimeLimit - state.screenTimeUsed > 0
                            ? `${state.screenTimeLimit - state.screenTimeUsed} mins left`
                            : "Limit Exceeded"}
                        </span>
                      </div>
                    </div>

                    {/* GPS Location Bento Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <span>Simulated GPS Location</span>
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="my-2.5">
                        <div className="text-base font-bold text-slate-900 tracking-tight truncate">
                          {state.currentLocation.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          LAT: {state.currentLocation.lat.toFixed(4)}, LNG: {state.currentLocation.lng.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          state.currentLocation.isSafe
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${state.currentLocation.isSafe ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                          {state.currentLocation.isSafe ? "SAFE ZONE" : "UNSAFE ZONE"}
                        </span>
                      </div>
                    </div>

                    {/* Remote Device Status Bento Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <span>Remote Device State</span>
                        {state.isDeviceLocked ? (
                          <Lock className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Unlock className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div className="my-2.5">
                        <div className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          {state.isDeviceLocked ? (
                            <span className="text-rose-600">LOCKED OUT</span>
                          ) : (
                            <span className="text-emerald-600">UNRESTRICTED</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          {state.isDeviceLocked ? "Temporary suspension active" : "Normal operating rules apply"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleRemoteLock(!state.isDeviceLocked)}
                        className={`w-full py-1.5 text-center text-[10px] font-bold rounded-lg transition-all uppercase ${
                          state.isDeviceLocked
                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                            : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        }`}
                        id="btn-remote-lock-toggle"
                      >
                        {state.isDeviceLocked ? "Unlock Device" : "Lock Device"}
                      </button>
                    </div>
                  </div>

                  {/* Real-Time Visual Maps Geofence Radar Widget */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Map className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">Live Geofence Map Radar</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Interactive Tracking</span>
                    </div>

                    {/* The SVG Simulator Radar Map */}
                    <div className="relative bg-[#E2E8F0] border border-slate-300 rounded-xl overflow-hidden h-[240px] flex items-center justify-center" style={{ backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }}>
                      <svg className="w-full h-full" viewBox="0 0 500 400">
                        {/* Render Geofence Safe Zones Circles */}
                        {/* Home Area */}
                        <circle cx={mapPoints["Home"].x} cy={mapPoints["Home"].y} r="65" fill="#10b981" fillOpacity="0.06" stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />
                        <text x={mapPoints["Home"].x} y={mapPoints["Home"].y - 70} fill="#059669" fontSize="9.5" fontWeight="bold" textAnchor="middle" className="font-mono">Geofence Safe Zone</text>

                        {/* School Area */}
                        <circle cx={mapPoints["School"].x} cy={mapPoints["School"].y} r="50" fill="#10b981" fillOpacity="0.06" stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />

                        {/* Local Park Area */}
                        <circle cx={mapPoints["Local Park"].x} cy={mapPoints["Local Park"].y} r="55" fill="#10b981" fillOpacity="0.06" stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />

                        {/* Unsafe Boundary representation */}
                        <circle cx={mapPoints["Unsafe Alleyway"].x} cy={mapPoints["Unsafe Alleyway"].y} r="40" fill="#f43f5e" fillOpacity="0.06" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4,4" />
                        <text x={mapPoints["Unsafe Alleyway"].x} y={mapPoints["Unsafe Alleyway"].y + 55} fill="#e11d48" fontSize="9.5" fontWeight="bold" textAnchor="middle" className="font-mono">Danger Alert Area</text>

                        {/* Plot preset landmarks */}
                        {Object.entries(mapPoints).map(([name, pt]) => (
                          <g key={name} className="opacity-95">
                            <circle cx={pt.x} cy={pt.y} r="4.5" fill={pt.isSafe ? "#059669" : "#e11d48"} />
                            <text x={pt.x} y={pt.y - 11} fill="#1e293b" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                              {name === "Home" ? "🏠 Home" : name === "School" ? "🏫 School" : name === "Local Park" ? "🌳 Park" : name === "The Mall" ? "🛍️ Mall" : "⚠️ Alleyway"}
                            </text>
                          </g>
                        ))}

                        {/* Active Path line representation from history */}
                        {state.locationHistory.length > 1 && (
                          <g opacity="0.7">
                            {state.locationHistory.slice(0, 4).map((h, idx) => {
                              const pt1 = mapPoints[h.name as keyof typeof mapPoints];
                              const nextH = state.locationHistory[idx + 1];
                              if (!pt1 || !nextH) return null;
                              const pt2 = mapPoints[nextH.name as keyof typeof mapPoints];
                              if (!pt2) return null;
                              return (
                                <line
                                  key={idx}
                                  x1={pt1.x}
                                  y1={pt1.y}
                                  x2={pt2.x}
                                  y2={pt2.y}
                                  stroke="#4f46e5"
                                  strokeWidth="2"
                                  strokeDasharray="3,3"
                                />
                              );
                            })}
                          </g>
                        )}

                        {/* Pulsing Dot of the Child's Live Position */}
                        {(() => {
                          const childPoint = mapPoints[state.currentLocation.name as keyof typeof mapPoints];
                          if (!childPoint) return null;
                          return (
                            <g>
                              {/* Pulsing Radar Circle */}
                              <circle cx={childPoint.x} cy={childPoint.y} r="18" fill="none" stroke={state.currentLocation.isSafe ? "#059669" : "#e11d48"} strokeWidth="2" className="animate-ping" style={{ transformOrigin: `${childPoint.x}px ${childPoint.y}px` }} />
                              {/* Core dot */}
                              <circle cx={childPoint.x} cy={childPoint.y} r="8" fill={state.currentLocation.isSafe ? "#059669" : "#e11d48"} stroke="#ffffff" strokeWidth="2" />
                              {/* Glowing Inner Light */}
                              <circle cx={childPoint.x} cy={childPoint.y} r="3" fill="#ffffff" />
                              {/* Tiny Child Indicator Flag */}
                              <rect x={childPoint.x - 26} y={childPoint.y + 12} width="52" height="15" rx="4" fill="#1e293b" stroke={state.currentLocation.isSafe ? "#10b981" : "#f43f5e"} strokeWidth="1" />
                              <text x={childPoint.x} y={childPoint.y + 22} fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">ACTIVE LEO</text>
                            </g>
                          );
                        })()}
                      </svg>

                      {/* Map info tag */}
                      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] text-slate-600 flex items-center gap-1 font-sans font-medium shadow-sm">
                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Interactive Map updates dynamically as Child simulation moves.</span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Alert / Security Notification center */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-rose-500" />
                        <span className="text-sm font-bold text-slate-900">Critical Parent Alerts</span>
                        {state.notifications.filter(n => !n.isRead).length > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {state.notifications.filter(n => !n.isRead).length} NEW
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleClearAlerts}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
                        id="clear-alerts-btn"
                      >
                        Clear Read
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[145px] overflow-y-auto pr-1">
                      {state.notifications.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500 font-medium">
                          No active security alerts logged. System secured.
                        </div>
                      ) : (
                        state.notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-xl border text-xs flex gap-2.5 items-start transition-all ${
                              notif.isRead
                                ? "bg-slate-50 border-slate-100 text-slate-500"
                                : "bg-rose-50 border-rose-150 text-slate-800"
                            }`}
                          >
                            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${notif.isRead ? "text-slate-400" : "text-rose-600"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className={`font-bold ${notif.isRead ? "text-slate-500" : "text-slate-900"}`}>
                                  {notif.title}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed truncate">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: RULES & AI CONTENT SCREENING */}
              {activeTab === "rules" && (
                <div className="p-6 space-y-6">
                  {/* Category toggles for Gemini Blocker */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        AI Guard Screen Interceptor Categories
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Select which standard inappropriate categories Gemini AI should block in real time.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: "adult", label: "Adult Content & Mature Search", desc: "Blocks pornography, standard adult media and mature sites." },
                        { id: "violence", label: "Violence & Explosives", desc: "Intercepts weapons buying, severe fighting, self-harm queries." },
                        { id: "gambling", label: "Gambling & Sports Betting", desc: "Filters casinos, slot simulation, and online lottery portals." },
                        { id: "bullying", label: "Cyberbullying & Abusive Chat", desc: "Detects hate speech, peer threat terms, and extreme insult chat." },
                        { id: "social_media", label: "Social Media Platforms", desc: "Restricts access to main social platforms (Tiktok, Reddit, etc.)" }
                      ].map(cat => {
                        const isChecked = state.blockedCategories.includes(cat.id);
                        return (
                          <div
                            key={cat.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isChecked
                                ? "bg-indigo-50/50 border-indigo-200 text-slate-950"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const list = isChecked
                                    ? state.blockedCategories.filter(c => c !== cat.id)
                                    : [...state.blockedCategories, cat.id];
                                  handleUpdateRules({ blockedCategories: list });
                                }}
                                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-white"
                              />
                              <div>
                                <span className="text-xs font-bold block">{cat.label}</span>
                                <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight font-medium">
                                  {cat.desc}
                                </span>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customizable screen time limit limits & bedtime scheduler */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                    <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">
                      Customizable Screen Limits & Bedtime
                    </h4>

                    {/* Limit Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-semibold">Daily Allowed Limit (Minutes)</span>
                        <span className="font-mono text-indigo-600 font-bold">{state.screenTimeLimit} minutes</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="360"
                        step="15"
                        value={state.screenTimeLimit}
                        onChange={(e) => handleUpdateRules({ screenTimeLimit: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        id="screen-limit-slider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">BEDTIME START HOUR</label>
                        <input
                          type="time"
                          value={state.bedtimeStart}
                          onChange={(e) => handleUpdateRules({ bedtimeStart: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-1.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          id="bedtime-start-picker"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">BEDTIME END HOUR</label>
                        <input
                          type="time"
                          value={state.bedtimeEnd}
                          onChange={(e) => handleUpdateRules({ bedtimeEnd: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-1.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          id="bedtime-end-picker"
                        />
                      </div>
                    </div>

                    {/* Interactive bedside sandbox switch */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <div className="text-left">
                          <span className="text-xs font-bold block text-slate-800">Force Bedtime (Testing simulation)</span>
                          <span className="text-[9px] text-slate-500 block">Lock child device out for bedtime testing</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSimulatingBedtime}
                          onChange={(e) => setIsSimulatingBedtime(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>
                  </div>

                  {/* Custom Blocked Keywords Registry */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Custom Restricted Keyword Registry</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Add specific phrases or terms you do not want your child searching or viewing on browser.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. cheat exam keys, dark net"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs flex-1 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        id="new-keyword-input"
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="bg-indigo-600 text-white px-4 py-2 text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                        id="add-keyword-btn"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {state.blockedKeywords.length === 0 ? (
                        <span className="text-xs text-slate-500 italic font-medium">No custom words loaded.</span>
                      ) : (
                        state.blockedKeywords.map(word => (
                          <span
                            key={word}
                            className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold"
                          >
                            <span>{word}</span>
                            <button
                              onClick={() => handleRemoveKeyword(word)}
                              className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: APP CONTROL */}
              {activeTab === "apps" && (
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Remote App Shield Locks</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Block or unblock individual games, social or learning apps on the child's phone in real time.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.allowedApps.map(appConf => (
                      <div
                        key={appConf.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                          appConf.isBlocked
                            ? "bg-rose-50/50 border-rose-150 text-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${appConf.isBlocked ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"}`}>
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{appConf.name}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold">
                              {appConf.category} • {appConf.screenTimeUsed} mins today
                            </span>
                          </div>
                        </div>

                        {/* Lock toggle for App */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase ${appConf.isBlocked ? "text-rose-600" : "text-emerald-600"}`}>
                            {appConf.isBlocked ? "Blocked" : "Allowed"}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!appConf.isBlocked}
                              onChange={(e) => handleToggleAppBlock(appConf.id, !e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: CHRONOLOGICAL ACTIVITY LOGS & AI EXPLAINER */}
              {activeTab === "logs" && (
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Oversight Activity Log History</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        View real-time records of searches, browser history, and intercepted triggers with AI reasoning details.
                      </p>
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="category-filter" className="text-xs font-bold text-slate-500 font-sans shrink-0">Filter By:</label>
                      <select
                        id="category-filter"
                        value={logCategoryFilter}
                        onChange={(e) => setLogCategoryFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold font-sans shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors"
                      >
                        <option value="all">🌐 All Activities</option>
                        <option value="blocked_all">🛡️ All Blocked Intercepts</option>
                        <option value="blocked_adult">🔞 Adult Content</option>
                        <option value="blocked_violence">💥 Violence & Weapons</option>
                        <option value="blocked_gambling">🎰 Gambling & Betting</option>
                        <option value="blocked_bullying">🗣️ Cyberbullying & Abuse</option>
                        <option value="blocked_social_media">📱 Social Media</option>
                        <option value="blocked_custom">⚠️ Custom Keywords</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const filteredLogs = (state?.activityLogs || []).filter(log => {
                      if (logCategoryFilter === "all") return true;
                      if (logCategoryFilter === "blocked_all") return log.isBlocked;
                      
                      if (!log.isBlocked) return false;
                      
                      const contentStr = (log.content || "").toLowerCase();
                      const reasonStr = (log.blockReason || "").toLowerCase();
                      const analysisStr = (log.aiAnalysis || "").toLowerCase();
                      const combinedText = `${contentStr} ${reasonStr} ${analysisStr}`;

                      if (logCategoryFilter === "blocked_adult") {
                        return combinedText.includes("adult") || combinedText.includes("mature") || combinedText.includes("nsfw") || combinedText.includes("porn") || combinedText.includes("naughty");
                      }
                      if (logCategoryFilter === "blocked_violence") {
                        return combinedText.includes("violence") || combinedText.includes("weapon") || combinedText.includes("criminality") || combinedText.includes("self-harm") || combinedText.includes("gun") || combinedText.includes("shoot") || combinedText.includes("fight") || combinedText.includes("pocket knife") || combinedText.includes("tactical");
                      }
                      if (logCategoryFilter === "blocked_gambling") {
                        return combinedText.includes("gambling") || combinedText.includes("casino") || combinedText.includes("betting") || combinedText.includes("sports betting") || combinedText.includes("slot") || combinedText.includes("poker");
                      }
                      if (logCategoryFilter === "blocked_bullying") {
                        return combinedText.includes("bullying") || combinedText.includes("abusive") || combinedText.includes("cyberbullying") || combinedText.includes("hate") || combinedText.includes("insult") || combinedText.includes("loser") || combinedText.includes("stupid");
                      }
                      if (logCategoryFilter === "blocked_social_media") {
                        return combinedText.includes("social_media") || combinedText.includes("social media") || combinedText.includes("tiktok") || combinedText.includes("instagram") || combinedText.includes("snapchat") || combinedText.includes("reddit");
                      }
                      if (logCategoryFilter === "blocked_custom") {
                        const matchedCustom = (state?.blockedKeywords || []).some(kw => combinedText.includes(kw.toLowerCase()));
                        return matchedCustom || combinedText.includes("custom") || combinedText.includes("keyword") || reasonStr.includes("custom blocklist");
                      }
                      return true;
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="text-center py-10 px-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <p className="text-sm font-bold text-slate-700">No activity logs found matching the filter</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">Try changing your filter criteria or simulate more activity on the device simulator.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {filteredLogs.map(log => (
                          <div
                            key={log.id}
                            className={`p-4 rounded-2xl border text-xs transition-all ${
                              log.isBlocked
                                ? "bg-rose-50/50 border-rose-150"
                                : "bg-slate-50 border-slate-150"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex gap-2.5 items-start">
                                {/* Icon type */}
                                {log.type === "web_search" && <Search className="w-4 h-4 text-indigo-600 mt-0.5" />}
                                {log.type === "web_visit" && <Globe className="w-4 h-4 text-indigo-600 mt-0.5" />}
                                {log.type === "chat" && <MessageSquare className="w-4 h-4 text-indigo-600 mt-0.5" />}
                                {log.type === "location" && <MapPin className="w-4 h-4 text-amber-500 mt-0.5" />}
                                {log.type === "app_usage" && <Activity className="w-4 h-4 text-purple-500 mt-0.5" />}

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                                      {log.type.replace("_", " ")}
                                    </span>
                                    {log.isBlocked && (
                                      <span className="bg-rose-100 text-rose-700 font-bold border border-rose-200 text-[9px] px-2 py-0.5 rounded-full">
                                        BLOCKED INTERCEPT
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-800 mt-1 font-bold">{log.content}</p>
                                  {log.appOrSite && (
                                    <span className="text-[10px] text-slate-500 italic block mt-0.5 font-medium">
                                      via {log.appOrSite}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>

                            {/* Expander block for AI reasoning logs */}
                            {log.isBlocked && (
                              <div className="mt-2.5 pt-2.5 border-t border-rose-200 bg-rose-50/50 p-3 rounded-xl text-[11px] text-rose-700">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-rose-600 mb-1">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>AI Shield Threat Intelligence Reason:</span>
                                </div>
                                <p className="leading-relaxed font-semibold">
                                  {log.blockReason || "Flagged content violation."}
                                </p>
                                {log.aiAnalysis && (
                                  <p className="text-[10px] text-slate-500 italic mt-1 leading-normal font-medium">
                                    {log.aiAnalysis}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>

            {/* COLUMN 2: INTERACTIVE CHILD DEVICE SMARTPHONE WRAPPER */}
            <section className="lg:col-span-5 flex justify-center" id="child-simulator">
              {/* Outer smartphone container frame */}
              <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-slate-900 border-[8px] border-slate-800 rounded-[44px] shadow-2xl ring-4 ring-slate-900 overflow-hidden flex flex-col justify-between">
                
                {/* Physical Top Notch / Speaker Grill */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
                  <div className="bg-slate-800 w-32 h-4.5 rounded-b-xl flex items-center justify-around px-2 pb-0.5">
                    {/* Speaker */}
                    <div className="w-10 h-1 bg-slate-900 rounded-full" />
                    {/* Camera dot */}
                    <div className="w-2.5 h-2.5 bg-slate-950 rounded-full border border-slate-850" />
                  </div>
                </div>

                {/* Smartphone Screen Header / Info Bar */}
                <div className="bg-slate-950 h-11 pt-5 px-5 flex justify-between items-center text-[10px] text-slate-400 select-none z-40 shrink-0">
                  <span className="font-semibold text-slate-200">10:45 AM</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[9px]">LTE</span>
                    <span>🔋 96%</span>
                  </div>
                </div>

                {/* Simulated Notification Toast */}
                <AnimatePresence>
                  {phoneNotification && (
                    <motion.div
                      initial={{ opacity: 0, y: -50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute top-12 inset-x-3 z-50 bg-slate-950 border border-slate-800 text-white rounded-2xl p-3 shadow-lg flex items-start gap-2 text-[10.5px]"
                    >
                      <div className="flex-1 text-left">
                        <p className="font-bold text-white flex items-center gap-1">
                          <span className={phoneNotification.type === "warning" ? "text-rose-500" : "text-emerald-500"}>●</span>
                          Shield Assistant
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-normal font-medium">{phoneNotification.message}</p>
                      </div>
                      <button 
                        onClick={() => setPhoneNotification(null)}
                        className="text-slate-400 hover:text-white font-bold px-1"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SCREEN SCREENING LOGIC OVERLAY: Lockouts interceptor screen */}
                <AnimatePresence mode="wait">
                  {lockReason ? (
                    <motion.div
                      key="locked"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4 z-30"
                    >
                      <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 animate-bounce">
                        <Lock className="w-8 h-8 stroke-[2.5]" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-white">Device Access Locked</h4>
                        <p className="text-xs text-slate-400">
                          {lockReason === "remote_lock" && "Your guardian has temporarily suspended device operation."}
                          {lockReason === "bedtime" && `Restricted by Bedtime rules (${state.bedtimeStart} - ${state.bedtimeEnd}). Sleep tight!`}
                          {lockReason === "screentime" && `Daily limits exceeded (${state.screenTimeLimit} minutes allowed daily achieved).`}
                        </p>
                      </div>

                      <div className="text-[9px] bg-slate-900 text-slate-400 font-mono px-2.5 py-1 rounded border border-slate-800/85">
                        PARENT CONTROLLER SYNC: LIVE
                      </div>

                      {lockReason === "screentime" && (
                        <button
                          onClick={handleResetScreenTime}
                          className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                        >
                          Request Extra 15 Mins
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    // IF DEVICE IS UNRESTRICTED - RENDER ACTIVE APPS
                    <motion.div
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 bg-slate-900 flex flex-col justify-between overflow-y-auto"
                    >
                      {/* PHONE APP: HOME DESKTOP */}
                      {activePhoneApp === "home" && (
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            {/* App Icon Desktops Grid */}
                            <div className="grid grid-cols-3 gap-y-5 gap-x-2 text-center pt-2">
                              {/* Web Browser App Icon */}
                              <button
                                onClick={() => {
                                  setActivePhoneApp("browser");
                                  setBrowserResult(null);
                                }}
                                className="flex flex-col items-center gap-1 group"
                                id="child-app-browser"
                              >
                                <div className="w-12 h-12 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/10 group-active:scale-95 transition-transform">
                                  <Globe className="w-6 h-6 text-slate-950" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-200">Chrome</span>
                              </button>

                              {/* Safe Chat App Icon */}
                              <button
                                onClick={() => setActivePhoneApp("chat")}
                                className="flex flex-col items-center gap-1 group"
                                id="child-app-chat"
                              >
                                <div className="w-12 h-12 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-md shadow-cyan-500/10 group-active:scale-95 transition-transform">
                                  <MessageSquare className="w-6 h-6 text-slate-950" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-200">Safe Chat</span>
                              </button>

                              {/* Simulated GPS App Icon */}
                              <button
                                onClick={() => setActivePhoneApp("gps")}
                                className="flex flex-col items-center gap-1 group"
                                id="child-app-gps"
                              >
                                <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/10 group-active:scale-95 transition-transform">
                                  <MapPin className="w-6 h-6 text-slate-950" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-200">GPS Tracker</span>
                              </button>

                              {/* Simulated pre-installed blockable apps */}
                              {state.allowedApps.map(appConf => (
                                <button
                                  key={appConf.id}
                                  onClick={() => {
                                    if (appConf.isBlocked) {
                                      showPhoneNotification(`This app (${appConf.name}) is restricted by parent remote locks!`, "warning");
                                    } else {
                                      showPhoneNotification(`Opened ${appConf.name}. Rules passed, content is safe!`, "success");
                                    }
                                  }}
                                  className={`flex flex-col items-center gap-1 group relative ${
                                    appConf.isBlocked ? "opacity-50" : ""
                                  }`}
                                >
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md group-active:scale-95 transition-transform ${
                                    appConf.isBlocked ? "bg-slate-800" : "bg-slate-850"
                                  }`}>
                                    <Smartphone className="w-6 h-6 text-slate-300" />
                                    {appConf.isBlocked && (
                                      <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex items-center justify-center border border-rose-500/30">
                                        <Lock className="w-4 h-4 text-rose-500" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-200 font-semibold truncate max-w-[60px]">
                                    {appConf.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* App drawer indicator & dashboard helpful hint */}
                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 text-center leading-normal">
                            <span className="font-bold text-white block mb-0.5">👉 Sandbox Testing Deck</span>
                            Tap any app icon above to simulate child's interactions, browser checks, or locations.
                          </div>
                        </div>
                      )}

                      {/* PHONE APP: CHROME BROWSER APP */}
                      {activePhoneApp === "browser" && (
                        <div className="flex-1 flex flex-col justify-between bg-slate-950 text-xs">
                          {/* Top browser bar */}
                          <div className="bg-slate-900 p-2 border-b border-slate-800 space-y-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setActivePhoneApp("home");
                                  setBrowserResult(null);
                                }}
                                className="text-slate-400 p-1 hover:text-white"
                              >
                                ◀ Home
                              </button>
                              <div className="bg-slate-950 rounded-md flex-1 py-1 px-2 text-[10px] text-slate-300 flex items-center gap-1 truncate border border-slate-800/60">
                                <Globe className="w-3 h-3 text-emerald-400" />
                                <span>safe-search://google.child</span>
                              </div>
                            </div>

                            {/* Search bar input row */}
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Search anything safely..."
                                value={browserInput}
                                onChange={(e) => setBrowserInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleBrowserSubmit()}
                                className="bg-slate-950 text-white p-1 px-2 rounded flex-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => handleBrowserSubmit()}
                                disabled={isAnalyzing}
                                className="bg-emerald-500 text-slate-950 font-bold px-2 rounded hover:bg-emerald-400 text-[10px] flex items-center justify-center min-w-[50px]"
                              >
                                {isAnalyzing ? "AI..." : "Search"}
                              </button>
                            </div>
                          </div>

                          {/* Search sandbox presets deck */}
                          <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Test Presets Blockers:</span>
                            <div className="flex flex-col gap-1">
                              {browserSearchPresets.map((preset, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleBrowserSubmit(preset.text)}
                                  className={`text-left p-1 rounded text-[10px] transition-colors border ${
                                    preset.cat
                                      ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10 text-rose-300"
                                      : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 text-emerald-300"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Browse Content Window view */}
                          <div className="flex-1 p-4 bg-slate-900/40 overflow-y-auto">
                            {browserResult ? (
                              browserResult.blocked ? (
                                <div className="text-center py-6 space-y-3">
                                  <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                    <Shield className="w-5 h-5 stroke-[2]" />
                                  </div>
                                  <div className="space-y-1">
                                    <h5 className="text-rose-400 font-bold uppercase tracking-wider text-xs">Access Intercepted</h5>
                                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                                      Your parent has restricted access to this category. The AI Shield blocked this query to keep you safe.
                                    </p>
                                  </div>
                                  <div className="bg-rose-500/5 p-2.5 rounded text-[10px] text-rose-300 border border-rose-500/10">
                                    <span className="font-bold block uppercase tracking-wider text-[8px] text-rose-400 mb-0.5">Block reason:</span>
                                    {browserResult.content}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <span className="text-[9px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold font-mono">
                                    AI Shield Verified Safe
                                  </span>
                                  <h5 className="font-bold text-white text-sm">{browserResult.title}</h5>
                                  <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-850">
                                    {browserResult.content}
                                  </p>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-10 text-slate-500 text-[11px] space-y-1">
                                <Globe className="w-8 h-8 text-slate-700 mx-auto" />
                                <p>Search or click any testing preset above.</p>
                                <p className="text-[9px] text-slate-600">The server analyzes keywords and uses Gemini to intercept threat matches.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PHONE APP: CHAT MESSAGING APP */}
                      {activePhoneApp === "chat" && (
                        <div className="flex-1 flex flex-col justify-between bg-slate-950 text-xs">
                          {/* Chat app top ribbon */}
                          <div className="bg-slate-900 p-2 border-b border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() => setActivePhoneApp("home")}
                              className="text-slate-400 hover:text-white"
                            >
                              ◀ Home
                            </button>
                            <span className="font-bold text-white">Class Chat with Leo</span>
                            <span className="w-4 h-4 rounded-full bg-emerald-500 border border-slate-950" />
                          </div>

                          {/* Chat testing presets */}
                          <div className="p-2.5 bg-slate-900 border-b border-slate-800 space-y-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Chat testing presets:</span>
                            <div className="flex gap-1.5">
                              {chatPresets.map((preset, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleChatSubmit(preset.text)}
                                  className={`p-1 px-1.5 rounded text-[10px] text-left leading-tight border transition-all ${
                                    preset.label.includes("Bullying")
                                      ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10 text-rose-300"
                                      : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 text-emerald-300"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dialogue Bubble Window */}
                          <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end bg-slate-900/20">
                            {chatHistory.map((chat, idx) => (
                              <div
                                key={idx}
                                className={`max-w-[85%] rounded-lg p-2 text-[11px] leading-relaxed ${
                                  chat.sender === "child"
                                    ? "bg-emerald-500 text-slate-950 self-end font-medium"
                                    : chat.sender === "leo"
                                    ? "bg-slate-800 text-white self-start"
                                    : "bg-rose-500/10 text-rose-300 self-center text-center text-[10px] border border-rose-500/20"
                                }`}
                              >
                                {chat.text}
                              </div>
                            ))}
                          </div>

                          {/* Chat footer input */}
                          <div className="p-2 bg-slate-900 border-t border-slate-800 flex gap-1">
                            <input
                              type="text"
                              placeholder="Write message..."
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                              className="bg-slate-950 text-white p-1.5 px-2.5 rounded-lg flex-1 text-[11px] focus:outline-none"
                            />
                            <button
                              onClick={() => handleChatSubmit()}
                              className="p-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PHONE APP: GPS MAP TRACKER SIMULATOR */}
                      {activePhoneApp === "gps" && (
                        <div className="flex-1 flex flex-col justify-between bg-slate-950 text-xs">
                          <div className="bg-slate-900 p-2.5 border-b border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() => setActivePhoneApp("home")}
                              className="text-slate-400 hover:text-white"
                            >
                              ◀ Home
                            </button>
                            <span className="font-bold text-white">GPS Simulator Coords</span>
                            <span className="text-[9px] bg-slate-950 text-slate-400 px-1 rounded">Live</span>
                          </div>

                          {/* Preset buttons to jump location */}
                          <div className="p-3 space-y-2 bg-slate-900 border-b border-slate-800">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Move Child Location to test Geofencing:</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {Object.keys(mapPoints).map(name => {
                                const pt = mapPoints[name as keyof typeof mapPoints];
                                const isCurrent = state.currentLocation.name === name;
                                return (
                                  <button
                                    key={name}
                                    onClick={() => handleSimulateLocation(name as keyof typeof mapPoints)}
                                    className={`p-1.5 rounded text-[10px] text-left transition-all border flex items-center justify-between ${
                                      isCurrent
                                        ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                                        : pt.isSafe
                                        ? "bg-slate-950 hover:bg-slate-800 border-slate-800 text-emerald-400"
                                        : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-rose-400"
                                    }`}
                                  >
                                    <span>
                                      {name === "Home" ? "🏠 Home" : name === "School" ? "🏫 School" : name === "Local Park" ? "🌳 Park" : name === "The Mall" ? "🛍️ Mall" : "⚠️ Alleyway"}
                                    </span>
                                    {isCurrent && <span className="text-[8px] uppercase tracking-widest bg-slate-950 text-white px-1 rounded">Here</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mini visual map screen */}
                          <div className="flex-1 p-3 flex flex-col justify-center items-center bg-slate-900">
                            <div className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-1.5">
                                <MapPin className={`w-4 h-4 ${state.currentLocation.isSafe ? "text-emerald-400" : "text-rose-400"}`} />
                                <span className="font-semibold text-white">Live Child Location</span>
                              </div>
                              <div className="text-slate-300 font-bold text-xs">
                                {state.currentLocation.name}
                              </div>
                              <div className="text-[10px] text-slate-400 leading-normal">
                                Geofence Safety Check:{" "}
                                <span className={state.currentLocation.isSafe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                  {state.currentLocation.isSafe ? "SAFE / APPROVED AREA" : "OUTSIDE GEOFENCE (ALARM ACTIVE)"}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono mt-2">
                                Coords updated on parent tracking radar immediately upon physical movement simulation.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Smartphone Swipe Pill Navigation bar */}
                <div className="h-6 bg-slate-950 flex items-center justify-center select-none z-40 shrink-0">
                  <div className="w-24 h-1 bg-slate-700 rounded-full" />
                </div>

              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
