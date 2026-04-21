import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Info, Loader2, Zap, AudioLines, 
  ShieldCheck, ShieldAlert, Shield, X, 
  Mic, Database, MessageSquare, LayoutGrid,
  User, Trash2, Brain, Save, PlusCircle, Menu, History, Bot, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveSession } from './hooks/useLiveSession';

import { Canvas } from '@react-three/fiber';
import { Earth } from './components/Earth';

/**
 * Tamim AI - System Assistant Edition (3D Earth, Memory, History & Dynamic Name)
 * Mohammad Nahid Bhai Version
 */
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
    setTranscript
  } = useLiveSession();

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ id: number; title: string; date: string; transcript: any[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'memory' | 'assistant' | 'voice' | 'permissions'>('profile');

  // Assistant Name State
  const [assistantName, setAssistantName] = useState(() => {
    return localStorage.getItem('tamim_assistant_name') || 'Tamim';
  });

  // Assistant Voice State
  const [assistantVoice, setAssistantVoice] = useState(() => {
    return localStorage.getItem('tamim_voice') || 'Puck';
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Handle Voice Change with Auto-Name Switch
  const handleVoiceChange = (voice: string) => {
    setAssistantVoice(voice);
    if (voice === 'Puck') {
      setAssistantName('Tamim');
    } else if (voice === 'Aoede' || voice === 'Kore') {
      setAssistantName('Tania');
    }
  };

  // User Profile State
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('tamim_profile');
    return saved ? JSON.parse(saved) : { userName: 'Mohammad Nahid', nickName: 'বন্ধু' };
  });

  // Memories State
  const [memories, setMemories] = useState<{ id: number; content: string; timestamp: string }[]>([]);
  
  // History State
  const [history, setHistory] = useState<{ id: number; title: string; date: string; transcript: any[] }[]>([]);

  useEffect(() => {
    const memList = JSON.parse(localStorage.getItem('tamim_memory_list') || '[]');
    setMemories(memList);
    const histList = JSON.parse(localStorage.getItem('tamim_chat_history') || '[]');
    setHistory(histList);
  }, [showSettings, showHistory]);

  const saveProfile = async () => {
    setIsSaving(true);
    // 1. Save to localStorage first
    localStorage.setItem('tamim_profile', JSON.stringify(profile));
    localStorage.setItem('tamim_assistant_name', assistantName);
    localStorage.setItem('tamim_voice', assistantVoice);
    
    // Trigger Success Animation (Toast)
    setToastMessage('সেটিংস সফলভাবে আপডেট করা হয়েছে! হুররে! 🎉');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setTimeout(() => setIsSaving(false), 1000);
    
    // 2. If connected, we need to restart the session to apply voice changes immediately
    if (isConnected) {
      await disconnect();
      setTimeout(() => {
        connect(assistantName, assistantVoice);
      }, 500);
    }
  };

  const deleteMemory = (id: number) => {
    const newList = memories.filter(m => m.id !== id);
    setMemories(newList);
    localStorage.setItem('tamim_memory_list', JSON.stringify(newList));
    localStorage.setItem('tamim_memory', newList.map(m => m.content).join('; '));
  };

  const startNewChat = () => {
    if (isConnected) {
      disconnect();
    }
    setTranscript([]);
    setSelectedSession(null);
    setTimeout(() => connect(), 300);
  };

  const permissions = [
    { name: 'Microphone', icon: Mic, status: 'Enabled', color: 'text-green-400' },
    { name: 'Storage Access', icon: Database, status: 'Enabled', color: 'text-green-400' },
    { name: 'SMS Control', icon: MessageSquare, status: 'Ready', color: 'text-blue-400' },
    { name: 'App Control', icon: LayoutGrid, status: 'Standby', color: 'text-cyan-400' },
  ];

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col relative text-[14px]">
      
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
                  <h2 className="text-xl font-black uppercase tracking-tighter">আগের আলাপ</h2>
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
                     ← লিস্টে ফিরে যান
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
                      <p className="text-[10px] uppercase font-bold tracking-widest">কোনো ইতিহাস পাওয়া যায়নি</p>
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
        <header className="p-4 sm:p-8 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-3 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <Menu className="w-5 h-5 text-white/60" />
            </button>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                <Zap className={`w-6 h-6 ${isConnected ? 'text-blue-400 fill-blue-400' : 'text-white/20'}`} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter uppercase italic text-white/90">{assistantName} System</h1>
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/40">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
                  Created by Mohammad Nahid
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={startNewChat}
              className="p-3 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-2 group"
              title="New Chat"
            >
              <PlusCircle className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="hidden xs:inline text-[10px] font-black uppercase tracking-widest text-blue-400">New Tab</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <SettingsIcon className="w-5 h-5 text-white/60" />
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
                {/* Tabs */}
                <div className="flex border-b border-white/5 p-2 gap-1">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-white/10 text-white font-black shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">প্রোফাইল</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('assistant')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'assistant' ? 'bg-white/10 text-white font-black shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <Bot className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest text-center">নাম</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('voice')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'voice' ? 'bg-white/10 text-white font-black shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest text-center">কণ্ঠ</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('memory')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'memory' ? 'bg-white/10 text-white font-black shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <Brain className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest text-center">স্মৃতি</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('permissions')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl transition-all ${activeTab === 'permissions' ? 'bg-white/10 text-white font-black shadow-inner' : 'text-white/40 hover:text-white/60'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest text-center">পারমিশন</span>
                  </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  {activeTab === 'profile' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">ইউজারের নাম</label>
                        <input 
                          type="text" 
                          value={profile.userName}
                          onChange={(e) => setProfile({ ...profile, userName: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">ডাকনাম (এসিস্ট্যান্ট এই নামে ডাকবে)</label>
                        <input 
                          type="text" 
                          value={profile.nickName}
                          onChange={(e) => setProfile({ ...profile, nickName: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 transition-all font-bold"
                        />
                      </div>
                      <button 
                        onClick={saveProfile}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/20"
                      >
                        <Save className="w-4 h-4" /> প্রোফাইল সেভ করুন
                      </button>
                    </div>
                  )}

                  {activeTab === 'assistant' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl space-y-2">
                        <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-widest">অ্যাসিস্ট্যান্ট নাম পরিবর্তন</h3>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          নিচের বক্সে আপনার অ্যাসিস্ট্যান্টের জন্য একটি নতুন নাম লিখুন। এটি অ্যাপের সব জায়গায় এবং চ্যাটেও আপডেট হয়ে যাবে।
                        </p>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">অ্যাসিস্ট্যান্টের বর্তমান নাম</label>
                        <input 
                          type="text" 
                          value={assistantName}
                          onChange={(e) => setAssistantName(e.target.value)}
                          placeholder="EX: Tamim or Jarvis"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 transition-all font-bold text-blue-400"
                        />
                      </div>
                      <button 
                        onClick={saveProfile}
                        className="w-full py-4 bg-white/10 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-white/10"
                      >
                        নতুন নাম সেভ করুন
                      </button>
                    </div>
                  )}

                  {activeTab === 'voice' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl space-y-2">
                        <h3 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">ভয়েস সেটিংস</h3>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          আপনার অ্যাসিস্ট্যান্টের জন্য একটি কণ্ঠস্বর নির্বাচন করুন। পুরুষ অথবা নারী কণ্ঠে কথা বলা শুরু করবে।
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleVoiceChange('Puck')}
                          className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${assistantVoice === 'Puck' ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${assistantVoice === 'Puck' ? 'bg-blue-600' : 'bg-white/10'}`}>
                            <Volume2 className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <span className="block font-black text-[11px] uppercase tracking-widest text-blue-400">Tamim</span>
                            <span className="text-[9px] text-white/30 uppercase font-mono tracking-tighter">Male Voice (Puck)</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => handleVoiceChange('Aoede')}
                          className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${assistantVoice === 'Aoede' ? 'bg-pink-600/20 border-pink-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${assistantVoice === 'Aoede' ? 'bg-pink-600' : 'bg-white/10'}`}>
                            <Volume2 className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <span className="block font-black text-[11px] uppercase tracking-widest text-pink-400">Tania</span>
                            <span className="text-[9px] text-white/30 uppercase font-mono tracking-tighter">Youthful Voice (Aoede)</span>
                          </div>
                        </button>
                      </div>

                      <button 
                        onClick={saveProfile}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl shadow-indigo-500/20"
                      >
                        ভয়েস সেভ করুন
                      </button>
                    </div>
                  )}

                  {activeTab === 'memory' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {memories.length > 0 ? (
                        memories.map((memory) => (
                          <div key={memory.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                            <div className="flex justify-between items-start">
                              <p className="font-medium flex-1 pr-4">{memory.content}</p>
                              <button 
                                onClick={() => deleteMemory(memory.id)}
                                className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[9px] text-white/20 mt-3 font-mono">{memory.timestamp}</p>
                          </div>
                        ))
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-white/20">
                          <Brain className="w-12 h-12 mb-4 opacity-5" />
                          <p className="text-xs italic">আমার স্মৃতিতে এখনো কোনো তথ্য নেই...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'permissions' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
                      <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl space-y-2">
                        <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-widest">অ্যাক্সেস সেটিংস</h3>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          অ্যাপের সঠিক কার্যকারিতার জন্য প্রয়োজনীয় অ্যাক্সেসগুলো এখান থেকে চেক করতে পারেন।
                        </p>
                      </div>
                      <div className="space-y-3">
                        {permissions.map((perm, index) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={perm.name}
                            className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl bg-white/5 ${perm.color}`}>
                                <perm.icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold">{perm.name}</p>
                                <p className="text-[9px] text-white/30 uppercase tracking-tighter">Verified System Access</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                              <div className={`w-1.5 h-1.5 rounded-full ${perm.status === 'Enabled' || perm.status === 'Ready' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                              <span className="text-[10px] font-mono font-bold tracking-tighter">{perm.status}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
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
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Listening Active</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3D Earth Stage */}
          <div className="w-full h-[40vh] sm:h-[60vh] relative">
            <Canvas shadows dpr={[1, 2]}>
              <Earth isSpeaking={isSpeaking} />
            </Canvas>
            
            {/* Overlay indicators */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <AnimatePresence>
                {isConnecting && (
                   <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     className="flex flex-col items-center gap-4"
                   >
                     <Loader2 className="w-12 h-12 text-white animate-spin opacity-50" />
                     <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/50">Initialising Core...</p>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Privacy/Mute Pulsing Toggle - REMOVED from center */}

          {/* Text Feedback */}
          <div className="mt-8 text-center space-y-4 max-w-sm relative z-20 pb-12 sm:pb-0">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 px-4">
              {isConnecting 
                ? "সংযুক্ত হচ্ছে..." 
                : isConnected 
                  ? (isMuted ? "গোপনীয়তা মোড সক্রিয়" : (isSpeaking ? "তামিম বলছে..." : "আমি শুনছি দস্তো...")) 
                  : `হাই, আমি ${assistantName}`}
            </h2>
            
            <p className="text-white/40 text-[12px] sm:text-sm leading-relaxed px-6 min-h-[3rem]">
              {error 
                ? <span className="text-red-400 font-bold">{error}। দয়া করে পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।</span>
                : (isConnected 
                    ? (isMuted 
                        ? "তামিম এখন আপনার কথা শুনছে না। যখন আপনি কথা বলতে চাইবেন, মিউট বন্ধ করুন।" 
                        : "আমি আপনার কথা শোনার জন্য তৈরি। যেকোনো কিছু জিজ্ঞেস করতে পারেন।")
                    : "আপনার পূর্ণাঙ্গ সিস্টেম অ্যাসিস্ট্যান্টের সাথে কথা বলতে নিচে ক্লিক করুন।")
              }
            </p>
          </div>
        </main>

        {/* Global Control Bar */}
        <footer className="p-6 sm:p-12 flex flex-col items-center gap-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="w-full max-w-sm flex items-center gap-3">
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
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden ${
                    isMuted 
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                    : 'bg-white/5 border-white/20 text-white/40 hover:border-white/40'
                  }`}
                >
                  {isMuted ? <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" /> : <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 opacity-40" />}
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
              onClick={isConnected ? disconnect : () => connect()}
              disabled={isConnecting}
              className={`relative flex-1 py-5 sm:py-6 rounded-[28px] font-black text-[11px] sm:text-[12px] uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-all flex items-center justify-center gap-4 cursor-pointer shadow-2xl ${
                isConnected 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20' 
                  : 'bg-white text-black hover:bg-zinc-100'
              } disabled:opacity-50`}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isConnected ? (
                <>বন্ধ করুন</>
              ) : (
                <>{assistantName} চালু করুন</>
              )}
            </motion.button>
          </div>

          <div className="flex gap-8 opacity-20 text-[9px] uppercase font-bold tracking-[0.25em]">
            <span>Neural V3</span>
            <span>PCM 24bit</span>
            <span>Latency: 120ms</span>
          </div>
        </footer>
      </div>
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.5, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              rotate: 0,
              transition: { type: 'spring', stiffness: 300, damping: 15 }
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.3 } }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-[0_20px_60px_rgba(37,99,235,0.5)] flex items-center gap-4 border border-white/20"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <PlusCircle className="w-4 h-4 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] opacity-60 leading-none mb-1">System Update</span>
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



