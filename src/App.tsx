import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon, Info, Loader2, Zap, AudioLines, 
  ShieldCheck, ShieldAlert, Shield, X, 
  Mic, Database, MessageSquare, LayoutGrid,
  User as UserIcon, Trash2, Brain, Save, PlusCircle, Menu, History, Bot, Volume2, LogOut, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveSession } from '@/hooks/useLiveSession';
import { Capacitor } from '@capacitor/core';
import { NahidLogo } from '@/components/NahidLogo';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useLocalAI } from '@/hooks/useLocalAI';
import { 
  signInWithGoogle, 
  logout, 
  auth, 
  saveUserProfile, 
  getUserProfile,
  addMemoryToCloud,
  getMemoriesFromCloud,
  deleteMemoryFromCloud,
  getSessionsFromCloud,
  saveSessionToCloud,
  checkAuthRedirect
} from '@/services/firebase';
import { biometricService } from '@/services/biometricService';
import { Fingerprint, Smartphone, Globe } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

/**
 * Nahid AI - System Assistant Edition (3D Earth, Memory, History & Dynamic Name)
 * Mohammad Nahid Version
 */
const APP_VERSION = "1.0.5";
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/nahidbdali07/nahid-ai/main/version.json";

export default function App() {
  const { 
    isConnected, 
    isConnecting, 
    isSpeaking, 
    isMuted,
    error, 
    transcript,
    connect, 
    disconnect,
    toggleMute,
    setTranscript,
    currentSessionId
  } = useLiveSession();

  const { t, i18n: i18nInstance } = useTranslation();
  const { setupLocalModel, isModelLoading, loadProgress, isReady: isLocalReady } = useLocalAI();

  // State Hooks
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ id: number; title: string; date: string; transcript: any[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'memory' | 'assistant' | 'voice' | 'permissions' | 'hybrid' | 'api' | 'language'>('profile');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('nahid_gemini_api_key') || '');
  const [hybridEnabled, setHybridEnabled] = useState(() => localStorage.getItem('nahid_hybrid') === 'true');
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  const [assistantName, setAssistantName] = useState(() => {
    return localStorage.getItem('nahid_assistant_name') || 'Nahid AI';
  });

  const [assistantVoice, setAssistantVoice] = useState(() => {
    return localStorage.getItem('nahid_voice') || 'Puck';
  });

  const [wakeWord, setWakeWord] = useState(() => {
    return localStorage.getItem('nahid_wake_word') || 'বন্ধু';
  });

  const [isAlwaysListening, setIsAlwaysListening] = useState(() => {
    return localStorage.getItem('nahid_always_listening') === 'true';
  });

  useWakeWord({
    wakeWord,
    enabled: isAlwaysListening && !isConnected && !isConnecting,
    onWake: () => {
      triggerHaptic();
      connect(assistantName, assistantVoice);
    }
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('nahid_profile');
    return saved ? JSON.parse(saved) : { userName: 'Mohammad Nahid', nickName: 'বন্ধু' };
  });

  const [memories, setMemories] = useState<{ id: number; content: string; timestamp: string }[]>([]);
  const [history, setHistory] = useState<{ id: number; title: string; date: string; transcript: any[] }[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [isLocationSharing, setIsLocationSharing] = useState(() => localStorage.getItem('nahid_location_sharing') === 'true');
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('nahid_biometric_enabled') === 'true');
  const [autoSystemControl, setAutoSystemControl] = useState(() => localStorage.getItem('nahid_auto_system_control') === 'true');
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  const [permStatus, setPermStatus] = useState({
    mic: 'unknown',
    storage: 'unknown',
    location: 'unknown',
    overlay: 'unknown',
    battery: 'unknown'
  });

  // Effect Hooks
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(VERSION_CHECK_URL);
        if (!response.ok) {
          console.warn("Version check skipped: Server returned status " + response.status);
          return;
        }
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (je) {
          console.warn("Version check failed: Response is not valid JSON.");
          return;
        }

        if (data && data.latest_version && data.latest_version !== APP_VERSION) {
          // Compare versions (simple string comparison for now, or semantic)
          // Usually version numbers are like 1.0.1
          const current = APP_VERSION.split('.').map(Number);
          const latest = data.latest_version.split('.').map(Number);
          
          let upgrade = false;
          for (let i = 0; i < Math.max(current.length, latest.length); i++) {
            const v1 = current[i] || 0;
            const v2 = latest[i] || 0;
            if (v2 > v1) { upgrade = true; break; }
            if (v1 > v2) break;
          }
          
          if (upgrade) {
            setLatestVersion(data.latest_version);
            setIsUpdateRequired(true);
          }
        }
      } catch (e) {
        console.error("Version check failed", e);
      }
    };
    checkVersion();
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18nInstance.language;
  }, [i18nInstance.language]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    checkAuthRedirect().then(user => {
      if (user) {
        setToastMessage(t('auth.loginSuccess'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      
      if (user) {
        const cloudProfile = await getUserProfile(user.uid);
        if (cloudProfile) {
          setProfile({ userName: cloudProfile.userName, nickName: cloudProfile.nickName });
          setAssistantName(cloudProfile.assistantName || 'Nahid AI');
          setAssistantVoice(cloudProfile.assistantVoice || 'Puck');
        }
        
        const cloudMemories = await getMemoriesFromCloud(user.uid);
        setMemories(cloudMemories as any);
        
        const cloudHistory = await getSessionsFromCloud(user.uid);
        setHistory(cloudHistory as any);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let watcherId: string | null = null;
    
    const startTracking = async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        watcherId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 10000
        }, (position, err) => {
          if (position) {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: position.timestamp
            });
          }
        });
      } catch (e) {
        console.error("Location tracking setup failed", e);
      }
    };

    if (isLocationSharing) {
      startTracking();
    }

    return () => {
      if (watcherId) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watcherId! });
        });
      }
    };
  }, [isLocationSharing]);

  useEffect(() => {
    if (isConnected && isLocationSharing && currentLocation) {
      const interval = setInterval(() => {
        console.log("Location context available for AI...");
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isLocationSharing, currentLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    
    const setupStatusBar = async () => {
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        } catch (e) {}

        if (localStorage.getItem('nahid_biometric_enabled') === 'true') {
          const available = await biometricService.isAvailable();
          if (available) {
            const success = await biometricService.authenticate('অ্যাপটি আনলক করতে আপনার ফিঙ্গারপ্রিন্ট দিন');
            if (success) {
              setToastMessage('স্বাগতম! আপনি বায়োমেট্রিক দিয়ে আনলক করেছেন।');
              setShowToast(true);
            }
          }
        }
      }
    };

    setupStatusBar();

    if (!currentUser) {
      const memList = JSON.parse(localStorage.getItem('nahid_memory_list') || '[]');
      setMemories(memList);
      const histList = JSON.parse(localStorage.getItem('nahid_chat_history') || '[]');
      setHistory(histList);
    } else {
      if (showSettings || showHistory) {
        getMemoriesFromCloud(currentUser.uid).then(m => setMemories(m as any));
        getSessionsFromCloud(currentUser.uid).then(h => setHistory(h as any));
      }
    }
    return () => clearTimeout(timer);
  }, [showSettings, showHistory, currentUser]);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  // Utility Functions
  const checkAllPermissions = async () => {
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as any });
      const { Geolocation } = await import('@capacitor/geolocation');
      const locPerm = await Geolocation.checkPermissions();
      const { Filesystem } = await import('@capacitor/filesystem');
      const storePerm = await Filesystem.checkPermissions();

      setPermStatus(prev => ({
        ...prev,
        mic: micPermission.state === 'granted' ? 'enabled' : (micPermission.state === 'denied' ? 'disabled' : 'prompt'),
        location: locPerm.location === 'granted' ? 'enabled' : (locPerm.location === 'denied' ? 'disabled' : 'prompt'),
        storage: storePerm.publicStorage === 'granted' ? 'enabled' : (storePerm.publicStorage === 'denied' ? 'disabled' : 'prompt')
      }));
    } catch (e) {
      console.error("Permission check failed", e);
    }
  };

  const requestPerm = async (type: 'mic' | 'storage' | 'location' | 'overlay' | 'battery') => {
    triggerHaptic();
    try {
      if (type === 'mic') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // Just trigger the OS popup
        setToastMessage(t('biometric.enabled', { defaultValue: 'Microphone access granted' }));
      } else if (type === 'location') {
        const { Geolocation } = await import('@capacitor/geolocation');
        const result = await Geolocation.requestPermissions();
        if (result.location === 'granted') {
          setIsLocationSharing(true);
          localStorage.setItem('nahid_location_sharing', 'true');
          setToastMessage('Location permission granted');
        } else {
          setToastMessage('Location permission denied');
        }
      } else if (type === 'storage') {
        const { Filesystem } = await import('@capacitor/filesystem');
        const result = await Filesystem.requestPermissions();
        if (result.publicStorage === 'granted') {
          setToastMessage('Storage permission granted');
        } else {
          setToastMessage('Storage permission denied');
        }
      } else if (type === ('overlay' as any)) {
        setToastMessage('Please enable "Display over other apps" in Android settings.');
        setShowToast(true);
      } else if (type === ('battery' as any)) {
        setToastMessage('Please disable battery optimization for Nahid AI.');
        setShowToast(true);
      }
      setTimeout(checkAllPermissions, 1000);
    } catch (e: any) {
      setToastMessage("Permission Request Notice: Please check system settings.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const triggerHaptic = async () => {
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) { }
    }
  };

  const handleLogin = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithGoogle();
      setToastMessage(t('auth.loginSuccess'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e: any) {
      console.error("Login Error:", e);
      if (e.code === 'auth/popup-closed-by-user') {
        setToastMessage(t('auth.popup-closed-by-user', { defaultValue: 'আপনি লগইন পপ-আপটি বন্ধ করে দিয়েছেন। আবার চেষ্টা করুন।' }));
      } else if (e.code === 'auth/cancelled-by-user') {
        setToastMessage(t('auth.cancelled-by-user', { defaultValue: 'লগইন বাতিল করা হয়েছে।' }));
      } else if (e.code === 'auth/popup-blocked') {
        setToastMessage(t('auth.popup-blocked', { defaultValue: 'আপনার ব্রাউজার পপ-আপ ব্লক করেছে। পপ-আপ অ্যালাউ করুন।' }));
      } else if (e.code === 'auth/invalid-api-key') {
        setToastMessage(t('auth.invalid-api-key', { defaultValue: 'Firebase API Key ভুল। প্রকল্প সেটিংস চেক করুন।' }));
      } else if (e.code === 'auth/unauthorized-domain' || e.message?.includes('requested action is invalid')) {
        setToastMessage(t('auth.unauthorized-domain', { defaultValue: 'লগইন ডোমেইনটি অনুমোদিত নয়। ফায়ারবেস কনসোলে ডোমেইন এবং SHA-1 (Android) যুক্ত করুন।' }));
      } else {
        setToastMessage(`${t('common.error')}: ${e.message || 'আবার চেষ্টা করুন'}`);
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset local UI state optional
      setHistory([]);
      setMemories([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setAssistantVoice(voice);
    if (voice === 'Puck') {
      setAssistantName('Nahid AI');
    } else if (voice === 'Aoede' || voice === 'Kore') {
      setAssistantName('Tania AI');
    }
  };

  const saveProfile = async () => {
    triggerHaptic();
    setIsSaving(true);
    
    // Save to localStorage
    localStorage.setItem('nahid_profile', JSON.stringify(profile));
    localStorage.setItem('nahid_assistant_name', assistantName);
    localStorage.setItem('nahid_voice', assistantVoice);
    localStorage.setItem('nahid_wake_word', wakeWord);
    localStorage.setItem('nahid_always_listening', isAlwaysListening.toString());
    
    // Save to Firebase if logged in
    if (currentUser) {
      await saveUserProfile(currentUser.uid, {
        ...profile,
        assistantName,
        assistantVoice,
        wakeWord,
        isAlwaysListening
      });
    }

    setToastMessage(t('assistant.settingsUpdated'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setTimeout(() => setIsSaving(false), 1000);
    
    if (isConnected) {
      await disconnect();
      setTimeout(() => {
        connect(assistantName, assistantVoice);
      }, 500);
    }
  };

  const deleteMemory = async (id: any) => {
    if (currentUser) {
      await deleteMemoryFromCloud(currentUser.uid, id);
      const cloudMemories = await getMemoriesFromCloud(currentUser.uid);
      setMemories(cloudMemories as any);
    } else {
      const newList = memories.filter(m => m.id !== id);
      setMemories(newList);
      localStorage.setItem('nahid_memory_list', JSON.stringify(newList));
      localStorage.setItem('nahid_memory', newList.map(m => m.content).join('; '));
    }
  };

  const startNewChat = async () => {
    if (isConnected) {
      await disconnect();
    }
    setTranscript([]);
    setSelectedSession(null);
    setTimeout(() => connect(assistantName, assistantVoice), 300);
  };

  const refreshHistory = useCallback(async () => {
    if (currentUser) {
      try {
        const cloudHistory = await getSessionsFromCloud(currentUser.uid);
        setHistory(cloudHistory as any);
      } catch (e) {
        console.error("Refresh history failed", e);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (showHistory && currentUser) {
      refreshHistory();
    }
  }, [showHistory, currentUser, refreshHistory]);

  const permissionsUI = [
    { 
      id: 'mic',
      name: t('permissions.microphone'), 
      desc: t('permissions.voiceDesc', { defaultValue: 'Enable voice interaction for AI' }),
      icon: Mic, 
      status: permStatus.mic,
      action: () => requestPerm('mic')
    },
    { 
      id: 'storage',
      name: t('permissions.storage'), 
      desc: t('permissions.filesDesc', { defaultValue: 'Allow AI to save and read data files' }),
      icon: Database, 
      status: permStatus.storage,
      action: () => requestPerm('storage')
    },
    { 
      id: 'location',
      name: t('permissions.location'), 
      desc: t('permissions.locationDesc'),
      icon: Shield, 
      status: isLocationSharing && permStatus.location === 'enabled' ? 'enabled' : 'disabled',
      action: () => requestPerm('location')
    },
    { 
      id: 'overlay',
      name: t('permissions.overlay', { defaultValue: 'Display over other apps' }), 
      desc: t('permissions.overlayDesc', { defaultValue: 'Allow AI to show response on top of other apps' }),
      icon: Zap, 
      status: permStatus.overlay,
      action: () => requestPerm('overlay' as any)
    },
    { 
      id: 'battery',
      name: t('permissions.battery', { defaultValue: 'Battery Optimization' }), 
      desc: t('permissions.batteryDesc', { defaultValue: 'Disable battery saving for 24/7 background service' }),
      icon: Zap, 
      status: permStatus.battery,
      action: () => requestPerm('battery' as any)
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col relative text-[10px]">
      <AnimatePresence>
        {isUpdateRequired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-xs w-full p-8 bg-zinc-900 border border-white/10 rounded-[32px] shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-bounce">
                <Zap className="w-8 h-8 text-blue-400 fill-blue-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase tracking-widest text-white">Update Required</h2>
                <p className="text-xs text-white/40 leading-relaxed uppercase">
                  A new update ({latestVersion}) is available. Please contact Nahid Bhai to get the latest version.
                </p>
              </div>

              <div className="py-4 border-y border-white/5">
                 <p className="text-[10px] text-zinc-500 uppercase font-mono">Current: v{APP_VERSION}</p>
              </div>

              <button 
                onClick={() => {
                  triggerHaptic();
                  window.open("https://t.me/+-rolJD4TnMhkYTRl", "_blank");
                }}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
              >
                Contact Nahid Bhai
              </button>
              
              <p className="text-[8px] text-white/10 uppercase tracking-widest">Access Restricted Until Updated</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="native-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative flex flex-col items-center"
            >
              <NahidLogo className="w-48 h-48 sm:w-64 sm:h-64" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center"
            >
                <h2 className="text-xl font-black tracking-[0.4em] uppercase italic text-white/90">Nahid AI</h2>
                <p className="text-[8px] uppercase font-bold tracking-[0.6em] text-white/30 mt-3">{t('home.intelligenceEvolution')}</p>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Space Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/3 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[900px] h-[900px] bg-indigo-600/5 rounded-full blur-[200px]" />
      </div>

      {/* Sidebar History */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[110] flex">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="relative w-85 bg-[#0a0a0f]/95 backdrop-blur-3xl h-full border-r border-white/10 p-6 flex flex-col gap-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-black uppercase tracking-tighter">{t('history.previousChats')}</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              {selectedSession ? (
                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                   <button 
                    onClick={() => setSelectedSession(null)}
                    className="flex items-center gap-2 text-[10px] uppercase font-black text-blue-400 mb-4 hover:underline"
                   >
                     ← {t('history.backToList')}
                   </button>
                   <h3 className="font-bold text-lg mb-4 text-white/90 leading-tight">{selectedSession.title}</h3>
                   <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                     {selectedSession.transcript.map((msg, i) => (
                       <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                         <span className="text-[8px] uppercase font-bold text-white/20 mb-1">
                           {msg.role === 'user' ? (profile.nickName || 'You') : assistantName}
                         </span>
                         <div className={`p-3 rounded-2xl text-[12px] leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100' : 'bg-white/5 text-white/80'}`}>
                           {msg.text}
                         </div>
                       </div>
                     ))}
                   </div>
                    <button 
                      onClick={() => {
                        setShowHistory(false);
                        connect(assistantName, assistantVoice, selectedSession);
                      }}
                      className="mt-4 w-full py-4 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {t('history.resumeChat', { defaultValue: 'চ্যাট চালিয়ে যান' })}
                    </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => setSelectedSession(item)}
                        className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all flex flex-col gap-1 group"
                      >
                        <span className="font-bold text-white/80 group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</span>
                        <span className="text-[9px] text-white/30 uppercase tracking-widest">{item.date}</span>
                      </button>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-center px-4">
                      <History className="w-12 h-12 mb-4 opacity-5" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">{t('history.noHistory')}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interface Layer */}
      <div className="relative z-10 flex flex-col h-screen">
        
        {/* Header */}
        <header className="p-2.5 sm:p-5 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5 text-white/60" />
            </button>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg">
                <Zap className={`w-4 h-4 ${isConnected ? 'text-blue-400 fill-blue-400' : 'text-white/20'}`} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter uppercase italic text-white/90 leading-none">Nahid AI</h1>
                <div className="flex items-center gap-0.5 font-mono text-[7px] uppercase tracking-widest text-white/40 mt-0.5">
                  <span className={`w-1 h-1 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : (isOnline ? 'bg-green-400' : 'bg-red-500')} `} />
                  {isOnline ? 'Ecosystem Active' : 'Offline Mode'}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={startNewChat}
              className="p-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1 group"
              title="New Chat"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="hidden xs:inline text-[8px] font-black uppercase tracking-widest text-blue-400">New</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
        </header>

        {/* Settings & Memory Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  boxShadow: isSaving ? '0 0 50px rgba(59, 130, 246, 0.4)' : '0 32px 64px -16px rgba(0,0,0,0.8)'
                }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative w-full max-w-lg bg-[#0a0a0f]/90 backdrop-blur-[50px] border border-white/10 rounded-[32px] overflow-hidden transition-all duration-500 flex flex-col h-[600px] max-h-[85vh] ${isSaving ? 'border-blue-500/50' : ''}`}
              >
                {/* Tabs - Horizontally Scrollable & Spacious */}
                <div className="flex overflow-x-auto border-b border-white/5 p-4 gap-4 no-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-shrink-0 snap-center min-w-[110px] py-4 px-6 flex flex-col items-center justify-center gap-3 rounded-[24px] transition-all duration-300 ${activeTab === 'profile' ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <UserIcon className="w-5 h-5" />
                    <span className="text-[12px] font-black uppercase tracking-wider">{t('nav.profile')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('assistant')}
                    className={`flex-shrink-0 snap-center min-w-[110px] py-4 px-6 flex flex-col items-center justify-center gap-3 rounded-[24px] transition-all duration-300 ${activeTab === 'assistant' ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Bot className="w-5 h-5" />
                    <span className="text-[12px] font-black uppercase tracking-wider">{t('nav.name')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('voice')}
                    className={`flex-shrink-0 snap-center min-w-[110px] py-4 px-6 flex flex-col items-center justify-center gap-3 rounded-[24px] transition-all duration-300 ${activeTab === 'voice' ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="text-[12px] font-black uppercase tracking-wider">{t('nav.voice')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('language')}
                    className={`flex-shrink-0 snap-center min-w-[90px] py-3 px-4 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300 ${activeTab === 'language' ? 'bg-blue-600 shadow-md text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{i18nInstance.language === 'en' ? 'Language' : 'ভাষা'}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('memory')}
                    className={`flex-shrink-0 snap-center min-w-[90px] py-3 px-4 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300 ${activeTab === 'memory' ? 'bg-blue-600 shadow-md text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Brain className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t('nav.memory')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('hybrid')}
                    className={`flex-shrink-0 snap-center min-w-[90px] py-3 px-4 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300 ${activeTab === 'hybrid' ? 'bg-blue-600 shadow-md text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t('nav.hybrid')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('api')}
                    className={`flex-shrink-0 snap-center min-w-[90px] py-3 px-4 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300 ${activeTab === 'api' ? 'bg-blue-600 shadow-md text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Database className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t('nav.api')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('permissions')}
                    className={`flex-shrink-0 snap-center min-w-[90px] py-3 px-4 flex flex-col items-center justify-center gap-2 rounded-xl transition-all duration-300 ${activeTab === 'permissions' ? 'bg-blue-600 shadow-md text-white scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{t('nav.permissions')}</span>
                  </button>
                </div>

                <div className="p-4 sm:p-6 flex-1 overflow-y-auto no-scrollbar">
                  {activeTab === 'profile' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
                      {/* Cloud Login Card */}
                      <div className={`p-4 rounded-xl border transition-all ${currentUser ? 'bg-green-600/10 border-green-500/20' : 'bg-blue-600/10 border-blue-500/20'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            {currentUser ? (
                              <img src={currentUser.photoURL || ''} className="w-8 h-8 rounded-full border border-green-500" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div>
                               <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                                 {currentUser ? 'Cloud Linked' : t('auth.guestMode')}
                               </h4>
                               <p className="text-[8px] text-white/40 uppercase font-mono leading-none">
                                 {currentUser ? currentUser.email : t('auth.signInToSync')}
                               </p>
                            </div>
                          </div>
                          {currentUser ? (
                             <button onClick={handleLogout} className="p-1.5 hover:bg-red-400/10 rounded-lg text-red-400 transition-all">
                               <LogOut className="w-4 h-4" />
                             </button>
                          ) : (
                             <button 
                               onClick={handleLogin}
                               disabled={isAuthLoading}
                               className="px-3 py-1.5 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                             >
                               {isAuthLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                               {t('auth.login')}
                             </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">{t('auth.biometricLogin')}</label>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <Fingerprint className={`w-6 h-6 ${biometricEnabled ? 'text-blue-400' : 'text-white/20'}`} />
                            <div>
                               <p className="text-[11px] font-black uppercase tracking-widest text-white">{t('auth.fingerprintLogin')}</p>
                               <p className="text-[9px] text-white/30 uppercase font-mono tracking-tighter">{t('auth.secureBiometric')}</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!biometricEnabled) {
                                const available = await biometricService.isAvailable();
                                if (!available) {
                                  setToastMessage(t('biometric.notAvailable', { defaultValue: 'আপনার ডিভাইসে বায়োমেট্রিক সাপোর্ট নেই।' }));
                                  setShowToast(true);
                                  return;
                                }
                                const success = await biometricService.authenticate(t('auth.enableBiometric'));
                                if (success) {
                                  setBiometricEnabled(true);
                                  localStorage.setItem('nahid_biometric_enabled', 'true');
                                  setToastMessage(t('biometric.enabled', { defaultValue: 'বায়োমেট্রিক লগইন চালু হয়েছে! 🎉' }));
                                } else {
                                  setToastMessage(t('biometric.failed', { defaultValue: 'বায়োমেট্রিক যাচাইকরণ ব্যর্থ হয়েছে।' }));
                                }
                                setShowToast(true);
                              } else {
                                setBiometricEnabled(false);
                                localStorage.removeItem('nahid_biometric_enabled');
                                setToastMessage(t('biometric.disabled', { defaultValue: 'বায়োমেট্রিক লগইন বন্ধ করা হয়েছে।' }));
                                setShowToast(true);
                              }
                            }}
                            className={`w-11 h-6 rounded-full p-1 transition-all flex ${biometricEnabled ? 'bg-blue-600 justify-end' : 'bg-white/10 justify-start'}`}
                          >
                            <div className="h-4 w-4 rounded-full bg-white shadow-lg" />
                          </button>
                        </div>
                        <p className="text-[9px] text-white/30 italic px-2">{i18nInstance.language === 'bn' ? 'এটি চালু করলে আপনি অ্যাপ খোলার সময় আঙুলের ছাপ দিয়ে আনলক করতে পারবেন।' : 'Unlock the app with your fingerprint on launch.'}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">{t('profile.userName')}</label>
                        <input 
                          type="text" 
                          value={profile.userName}
                          onChange={(e) => setProfile({ ...profile, userName: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500/50 transition-all font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">{t('profile.nickName')} ({t('profile.personalize')})</label>
                        <input 
                          type="text" 
                          value={profile.nickName}
                          onChange={(e) => setProfile({ ...profile, nickName: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500/50 transition-all font-bold text-xs"
                        />
                      </div>
                      <button 
                        onClick={saveProfile}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
                      >
                        <Save className="w-4 h-4" /> {t('common.save')} {t('nav.profile')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'assistant' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-xl space-y-1">
                        <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-widest">{t('assistant.nameChange', { defaultValue: 'অ্যাসিস্ট্যান্ট নাম পরিবর্তন' })}</h3>
                        <p className="text-[9px] text-white/40 leading-tight">
                          {i18nInstance.language === 'bn' ? 'নিচের বক্সে আপনার অ্যাসিস্ট্যান্টের জন্য একটি নতুন নাম লিখুন।' : 'Change the name of your AI assistant.'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">{t('assistant.currentName', { defaultValue: 'Assistant Name' })}</label>
                        <input 
                          type="text" 
                          value={assistantName}
                          onChange={(e) => setAssistantName(e.target.value)}
                          placeholder="Nahid AI or Jarvis"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500/50 transition-all font-bold text-blue-400 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">{t('assistant.wakeWord')}</label>
                        <input 
                          type="text" 
                          value={wakeWord}
                          onChange={(e) => setWakeWord(e.target.value)}
                          placeholder="বন্ধু"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-500/50 transition-all font-bold text-yellow-400 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAlwaysListening ? 'bg-green-600' : 'bg-white/10'}`}>
                            <Mic className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">{t('permissions.alwaysListening')}</p>
                            <p className="text-[8px] text-white/30 uppercase font-mono tracking-tighter">BG Service</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsAlwaysListening(!isAlwaysListening)}
                          className={`w-11 h-6 rounded-full p-1 transition-all flex ${isAlwaysListening ? 'bg-green-600 justify-end' : 'bg-white/10 justify-start'}`}
                        >
                          <div className="h-4 w-4 rounded-full bg-white shadow-lg" />
                        </button>
                      </div>
                      <button 
                        onClick={saveProfile}
                        className="w-full py-3 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-white/10"
                      >
                        {t('common.save')} {t('nav.name')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'voice' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleVoiceChange('Puck')}
                          className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${assistantVoice === 'Puck' ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${assistantVoice === 'Puck' ? 'bg-blue-600' : 'bg-white/10'}`}>
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <span className="block font-black text-[10px] uppercase tracking-widest text-blue-400">Nahid AI (Male)</span>
                            <span className="text-[8px] text-white/30 uppercase font-mono tracking-tighter">Professional</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => handleVoiceChange('Aoede')}
                          className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${assistantVoice === 'Aoede' ? 'bg-pink-600/20 border-pink-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${assistantVoice === 'Aoede' ? 'bg-pink-600' : 'bg-white/10'}`}>
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <span className="block font-black text-[10px] uppercase tracking-widest text-pink-400">Tania AI (Female)</span>
                            <span className="text-[8px] text-white/30 uppercase font-mono tracking-tighter">Youthful</span>
                          </div>
                        </button>
                      </div>

                      <button 
                        onClick={saveProfile}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl"
                      >
                         {t('common.save')} {t('nav.voice')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'language' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl space-y-2">
                        <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-widest">{i18nInstance.language === 'en' ? 'Language Settings' : 'ভাষা সেটিংস'}</h3>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                  {i18nInstance.language === 'en' ? 'Select your preferred language for the application interface.' : 'অ্যাপ্লিকেশন ইন্টারফেসের জন্য আপনার পছন্দসই ভাষা নির্বাচন করুন।'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => i18nInstance.changeLanguage('en')}
                  className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${i18nInstance.language === 'en' ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                   <div className="text-center">
                    <span className="block font-black text-[14px] uppercase tracking-widest text-white">English</span>
                    <span className="text-[9px] text-white/30 uppercase font-mono tracking-tighter">Native</span>
                  </div>
                </button>

                <button 
                  onClick={() => i18nInstance.changeLanguage('bn')}
                  className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${i18nInstance.language === 'bn' ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                   <div className="text-center">
                    <span className="block font-black text-[14px] uppercase tracking-widest text-white">বাংলা</span>
                    <span className="text-[9px] text-white/30 uppercase font-mono tracking-tighter">Bengali</span>
                  </div>
                </button>
              </div>
                    </div>
                  )}

                  {activeTab === 'memory' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      {memories.length > 0 ? (
                        memories.map((memory) => (
                          <div key={memory.id} className="p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                            <div className="flex justify-between items-start">
                              <p className="text-[10px] font-medium flex-1 pr-2">{memory.content}</p>
                              <button 
                                onClick={() => deleteMemory(memory.id)}
                                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[7px] text-white/20 mt-1.5 font-mono">{memory.timestamp}</p>
                          </div>
                        ))
                      ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-white/20">
                          <Brain className="w-8 h-8 mb-2 opacity-5" />
                          <p className="text-[10px] italic">{t('memory.empty')}</p>
                        </div>
                      )}
                    </div>
                  )}

                   {activeTab === 'api' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">Gemini API Key</label>
                        <div className="relative group">
                          <input 
                            type="password" 
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder={t('api.placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500/50 transition-all font-mono text-[10px]"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          localStorage.setItem('nahid_gemini_api_key', geminiApiKey);
                          setToastMessage(t('common.saved'));
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
                      >
                        <Save className="w-4 h-4" /> {t('common.save')}
                      </button>
                    </div>
                  )}

                  {activeTab === 'permissions' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
                      {permissionsUI.map((p) => (
                        <div key={p.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg ${p.status === 'enabled' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                              <p.icon className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">{p.name}</p>
                               <p className="text-[8px] text-white/30 uppercase font-mono tracking-tighter line-clamp-1">{p.desc}</p>
                            </div>
                          </div>
                          <button 
                            onClick={p.action}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${p.status === 'enabled' ? 'bg-red-600 text-white' : 'bg-white text-black'}`}
                          >
                            {p.status === 'enabled' ? 'Active' : 'Grant'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'hybrid' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[32px] space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                             <h3 className="text-white font-black text-xs uppercase tracking-widest mb-1">{t('hybrid.title')}</h3>
                             <p className="text-[10px] text-white/40 uppercase font-mono tracking-tighter">{t('hybrid.subtitle')}</p>
                           </div>
                           <button 
                            onClick={() => {
                              const next = !hybridEnabled;
                              setHybridEnabled(next);
                              localStorage.setItem('nahid_hybrid', next.toString());
                            }}
                            className={`w-14 h-8 rounded-full p-1 transition-all flex ${hybridEnabled ? 'bg-blue-500 justify-end' : 'bg-white/10 justify-start'}`}
                           >
                             <div className="h-6 w-6 rounded-full bg-white shadow-lg" />
                           </button>
                        </div>
                        
                        <div className="h-[1px] bg-white/5" />
                        
                        <p className="text-[11px] text-white/60 leading-relaxed italic">
                          {t('hybrid.desc')}
                        </p>
                      </div>

                      {hybridEnabled && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-500">
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className={`p-4 rounded-2xl ${isLocalReady ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    <Brain className="w-6 h-6" />
                                 </div>
                                 <div className="flex-1">
                                    <h4 className="font-black text-[11px] uppercase tracking-widest mb-1">{t('hybrid.engine')}</h4>
                                    <p className="text-[9px] font-mono text-white/30 uppercase">
                                      {isLocalReady ? t('hybrid.statusReady') : (isModelLoading ? t('hybrid.statusDownloading') : t('hybrid.statusMissing'))}
                                    </p>
                                 </div>
                              </div>

                              {isModelLoading && (
                                <div className="space-y-2">
                                   <div className="flex justify-between text-[8px] uppercase font-black text-white/40">
                                      <span>Downloading ({~~loadProgress}%)</span>
                                      <span>2.4 GB remaining</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${loadProgress}%` }}
                                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                      />
                                   </div>
                                </div>
                              )}

                              {!isLocalReady && !isModelLoading && (
                                <button 
                                  onClick={setupLocalModel}
                                  className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                                >
                                  <PlusCircle className="w-4 h-4" /> {t('hybrid.downloadStart')}
                                </button>
                              )}
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                 <h5 className="text-[9px] uppercase font-black text-white/30 mb-2">{t('hybrid.deviceTarget')}</h5>
                                 <p className="text-xs font-bold truncate">OnePlus 11R 5G</p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                 <h5 className="text-[9px] uppercase font-black text-white/30 mb-2">{t('hybrid.chipset')}</h5>
                                 <p className="text-xs font-bold truncate">SD 8+ Gen 1</p>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
                   <button 
                    onClick={() => setShowSettings(false)}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Interaction Area */}
        <main className="flex-1 flex flex-col items-center justify-center relative">
          
          {/* Support Info for User's Turn */}
          <AnimatePresence>
            {isConnected && !isSpeaking && !isMuted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-8 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 z-20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t('home.listeningActive')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Logo Stage */}
          <div className="w-full h-[28vh] sm:h-[35vh] flex items-center justify-center relative touch-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="relative w-32 h-32 sm:w-40 sm:h-40"
            >
              <NahidLogo className="w-full h-full" />
            </motion.div>
            
            {/* Overlay indicators */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <AnimatePresence>
                {isConnecting && (
                   <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     className="flex flex-col items-center gap-2"
                   >
                     <Loader2 className="w-8 h-8 text-white animate-spin opacity-30" />
                     <p className="text-[7px] uppercase tracking-[0.3em] font-black text-white/30">{t('home.initializing')}</p>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Privacy/Mute Pulsing Toggle - REMOVED from center */}

          {/* Text Feedback */}
          <div className="mt-1 text-center space-y-0 max-w-xs relative z-20 pb-3 sm:pb-0">
            <h2 className="text-[13px] sm:text-[15px] font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 px-6">
              {isConnecting 
                ? t('home.connecting') 
                : isConnected 
                  ? (isMuted ? t('home.privacyActive') : (isSpeaking ? `${assistantName} ${t('home.speaking')}` : t('home.listening'))) 
                  : `${t('home.greeting')} ${assistantName}`}
            </h2>
            
            <p className="text-white/30 text-[7px] sm:text-[8px] leading-tight px-12 min-h-[1rem]">
              {error 
                ? <span className="text-red-400 font-bold">{error}। {t('home.errorText')}</span>
                : (isConnected 
                    ? (isMuted 
                        ? `${assistantName} ${t('home.privacyInfo')}` 
                        : t('home.readyToListen'))
                    : t('home.fullAssistant'))
              }
            </p>
          </div>
        </main>

        {/* Global Control Bar */}
        <footer className="p-2 sm:p-4 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="w-full max-w-[240px] flex items-center gap-2">
            {/* New Location for Mute Toggle */}
            <AnimatePresence>
              {isConnected && (
                <motion.button
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMute}
                  className={`flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-md border flex items-center justify-center transition-all duration-500 relative overflow-hidden ${
                    isMuted 
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                    : 'bg-white/5 border-white/20 text-white/30 hover:border-white/40'
                  }`}
                >
                  {isMuted ? <ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4" /> : <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />}
                  {isMuted && (
                    <motion.div 
                      layoutId="mute-glow"
                      className="absolute inset-0 bg-orange-500/10 animate-pulse pointer-events-none"
                    />
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: isConnecting ? 1 : 1.02 }}
              whileTap={{ scale: isConnecting ? 1 : 0.98 }}
              onClick={() => {
                triggerHaptic();
                isConnected ? disconnect() : connect();
              }}
              disabled={isConnecting}
              className={`relative flex-1 py-2 sm:py-2.5 rounded-md font-black text-[7.5px] sm:text-[8.5px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isConnected 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20' 
                  : 'bg-white text-black hover:bg-zinc-100'
              } disabled:opacity-50`}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isConnected ? (
                <>{t('home.stopAssistant')}</>
              ) : (
                <>{assistantName} {t('home.startAssistant')}</>
              )}
            </motion.button>
          </div>
        </footer>
      </div>
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl border border-white/10"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
