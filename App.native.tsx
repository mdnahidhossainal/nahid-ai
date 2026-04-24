import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Modal
} from 'react-native';
import { 
  Mic, 
  Settings as SettingsIcon, 
  History, 
  Zap, 
  X, 
  Volume2, 
  VolumeX, 
  ArrowLeft,
  Save,
  User,
  Brain,
  Database,
  Cloud,
  CloudOff,
  Send,
  Bot,
  MessageSquare,
  Play,
  Zap as ZapIcon,
  Trash2,
  Plus,
  Maximize2,
  AudioLines
} from 'lucide-react-native';
import { useLiveSessionNative } from './src/hooks/useLiveSessionNative';
import { LocalModelManager } from './src/components/LocalModelManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { GoogleGenAI } from "@google/genai";
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

export default function NativeApp() {
  const { 
    isConnected, 
    isConnecting, 
    isSpeaking, 
    error, 
    transcript: voiceTranscript, 
    connect, 
    disconnect,
    sendMessageOffline,
    engineStatus,
    latestAction,
    sendMessageOnline,
    setTranscript: setVoiceTranscript
  } = useLiveSessionNative();

  const [chatTranscript, setChatTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [assistantName, setAssistantName] = useState('Nahid AI');
  const [assistantVoice, setAssistantVoice] = useState('Puck');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isChatMode, setIsChatMode] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const currentSentenceIndexRef = useRef(0);
  const sentencesRef = useRef<string[]>([]);
  const activeSpeakingIndexRef = useRef<number | null>(null);
  const [copiedIndexNative, setCopiedIndexNative] = useState<number | null>(null);
  const [showFullEditorNative, setShowFullEditorNative] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<number | null>(null);
  const currentChatSessionIdRef = useRef<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Load settings on startup
    const loadSettings = async () => {
      const savedName = await AsyncStorage.getItem('nahid_assistant_name');
      const savedVoice = await AsyncStorage.getItem('nahid_voice');
      const offlineMode = await AsyncStorage.getItem('nahid_offline_mode');
      const savedHistory = await AsyncStorage.getItem('nahid_history');

      if (savedName) setAssistantName(savedName);
      if (savedVoice) setAssistantVoice(savedVoice);
      if (offlineMode) setIsOfflineMode(offlineMode === 'true');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    };
    
    // Simple network check on start
    const checkNetwork = async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (!net.isConnected) setIsOfflineMode(true);
      } catch (e) {}
    };

    loadSettings();
    checkNetwork();
  }, []);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToggleConnect = () => {
    triggerHaptic();
    if (isConnected) {
      disconnect();
    } else {
      connect(assistantName, assistantVoice, isOfflineMode);
    }
  };

  const handleSendMessage = async () => {
    if (!textInput.trim() || isChatLoading) return;
    triggerHaptic();
    const currentInput = textInput.trim();
    setTextInput(''); // Clear immediately
    
    if (isOfflineMode) {
      sendMessageOffline(currentInput);
      return;
    }

    try {
      setIsChatLoading(true);
      const userMsg = { role: 'user' as const, text: currentInput };
      const updatedUserTranscript = [...chatTranscript, userMsg];
      setChatTranscript(updatedUserTranscript);
      saveHistoryNative(updatedUserTranscript, 'chat');

      const apiKey = (process.env.GEMINI_API_KEY as string);
      const ai = new GoogleGenAI({ apiKey });
      
      const systemContext = "You are a specialized AI assistant. Respond in Bengali. Keep your replies clean, natural, and polished. AVOID excessive markdown like bold markers (**) unless strictly necessary. Use clear paragraphs.";
      const prompt = `${systemContext}\n\n` + updatedUserTranscript.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nAssistant:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const responseText = response.text?.trim() || "";
      await simulateTypingNative(responseText);
    } catch (e) {
      console.error("Native Chat Error", e);
      Alert.alert("Error", "চ্যাট রেসপন্স পাওয়া যায়নি।");
    } finally {
      setIsChatLoading(false);
    }
  };

  const simulateTypingNative = async (fullText: string) => {
    setIsTyping(true);
    setStreamingResponse('');
    const words = fullText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
       currentText += words[i] + (i < words.length - 1 ? ' ' : '');
       setStreamingResponse(currentText);
       await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    const updatedFullTranscript = [...chatTranscript, { role: 'model' as const, text: fullText }];
    setChatTranscript(updatedFullTranscript);
    setStreamingResponse('');
    setIsTyping(false);
    saveHistoryNative(updatedFullTranscript, 'chat');
  };

  const saveHistoryNative = async (transcriptList: any[], type: 'chat' | 'voice') => {
    try {
      const sessionId = currentChatSessionIdRef.current || Date.now();
      if (!currentChatSessionIdRef.current && type === 'chat') {
        currentChatSessionIdRef.current = sessionId;
        setCurrentChatSessionId(sessionId);
      }

      const newSession = {
        id: sessionId,
        title: transcriptList[0]?.text.substring(0, 30) || "Conversation",
        date: new Date().toLocaleString('bn-BD'),
        type: type,
        transcript: transcriptList
      };
      
      setHistory(prevHistory => {
        const filtered = prevHistory.filter(h => h.id !== sessionId);
        const updated = [newSession, ...filtered.slice(0, 19)];
        AsyncStorage.setItem('nahid_history', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Save history error", e);
    }
  };

  const startNewChatNative = () => {
    triggerHaptic();
    setChatTranscript([]);
    currentChatSessionIdRef.current = null;
    setCurrentChatSessionId(null);
    setStreamingResponse('');
    setTextInput('');
  };

  useEffect(() => {
    // Stop speech when leaving chat mode or closing history/session
    if (!isChatMode && (!showHistory || !selectedSession)) {
      Speech.stop();
      setSpeakingMessageIndex(null);
      setIsSpeechPaused(false);
    }
  }, [isChatMode, showHistory, selectedSession]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (speakingMessageIndex !== null && !isSpeechPaused) {
        const isSpeaking = await Speech.isSpeakingAsync();
        if (!isSpeaking) {
          setSpeakingMessageIndex(null);
          setIsSpeechPaused(false);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [speakingMessageIndex, isSpeechPaused]);

  const speakText = async (text: string, index: number, restart: boolean = false) => {
    if (restart) {
      Speech.stop();
      currentSentenceIndexRef.current = 0;
      setIsSpeechPaused(false);
      activeSpeakingIndexRef.current = index;
      setSpeakingMessageIndex(index);
      sentencesRef.current = text.match(/[^.!?|।]+[.!?|।]*|[^.!?|।]+/g) || [text];
      
      setTimeout(() => {
        playNextSentenceNative(index);
      }, 50);
      return;
    } 
    
    if (speakingMessageIndex === index) {
      if (isSpeechPaused) {
        setIsSpeechPaused(false);
        playNextSentenceNative(index);
        return;
      } else {
        Speech.stop();
        setIsSpeechPaused(true);
        return;
      }
    }

    Speech.stop();
    currentSentenceIndexRef.current = 0;
    sentencesRef.current = text.match(/[^.!?|।]+[.!?|।]*|[^.!?|।]+/g) || [text];
    
    activeSpeakingIndexRef.current = index;
    setSpeakingMessageIndex(index);
    setIsSpeechPaused(false);
    playNextSentenceNative(index);
  };

  const playNextSentenceNative = (msgIndex: number) => {
    const sentences = sentencesRef.current;
    const currentIndex = currentSentenceIndexRef.current;

    if (activeSpeakingIndexRef.current !== msgIndex) return;

    if (currentIndex >= sentences.length) {
      setSpeakingMessageIndex(null);
      setIsSpeechPaused(false);
      currentSentenceIndexRef.current = 0;
      return;
    }

    const currentText = sentences[currentIndex].trim();
    if (!currentText) {
      currentSentenceIndexRef.current++;
      playNextSentenceNative(msgIndex);
      return;
    }

    Speech.speak(currentText, {
      language: 'bn-BD',
      onDone: () => {
        if (activeSpeakingIndexRef.current === msgIndex && !isSpeechPaused) {
          if (currentSentenceIndexRef.current === currentIndex) {
            currentSentenceIndexRef.current++;
            setTimeout(() => {
              playNextSentenceNative(msgIndex);
            }, 100);
          }
        }
      },
      onError: (e) => {
        console.error("Native Speech Chunk Error", e);
        setSpeakingMessageIndex(null);
        setIsSpeechPaused(false);
      }
    });
  };

  const handleCopyNative = async (text: string, index: number) => {
    const Clipboard = (await import('expo-clipboard')).default;
    await Clipboard.setStringAsync(text);
    setCopiedIndexNative(index);
    triggerHaptic();
    // disappear after 1.2s
    setTimeout(() => setCopiedIndexNative(null), 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.iconButton}>
            <History color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModels(true)} style={[styles.iconButton, { marginLeft: 10 }]}>
            <Database color="#3b82f6" size={20} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerTitleContainer}>
           <Text style={styles.headerTitle}>{assistantName}</Text>
           <View style={styles.statusBadge}>
             {isOfflineMode ? (
               <CloudOff color="#f87171" size={10} style={{ marginRight: 4 }} />
             ) : (
               <Cloud color="#4ade80" size={10} style={{ marginRight: 4 }} />
             )}
             <Text style={[styles.statusText, { color: isOfflineMode ? '#f87171' : '#4ade80' }]}>
               {isOfflineMode ? 'অফলাইন ইঞ্জিন' : 'অনলাইন'}
             </Text>
           </View>
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}>
          <SettingsIcon color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* Main Content - Voice Interface */}
      <View style={styles.mainContent}>
        {/* Model Manager Modal */}
        {showModels && (
          <View style={styles.overlay}>
             <SafeAreaView style={styles.overlayContent}>
                <View style={styles.header}>
                   <TouchableOpacity onPress={() => setShowModels(false)}>
                     <ArrowLeft color="white" size={24} />
                   </TouchableOpacity>
                   <Text style={styles.headerTitle}>মডেল ম্যানেজার</Text>
                   <View style={{ width: 24 }} />
                </View>
                <LocalModelManager />
             </SafeAreaView>
          </View>
        )}
        {!isConnected && !isConnecting && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.salamText}>আসসালামু আলাইকুম</Text>
            <Text style={styles.welcomeText}>নাহিদ এআই সিস্টেমে স্বাগতম</Text>
          </View>
        )}

        <View style={styles.orbContainer}>
           {/* Animated Orb Placeholder */}
           <View style={[
             styles.orb, 
             isConnected && styles.orbActive,
             isSpeaking && styles.orbSpeaking
           ]}>
             <Text style={styles.orbText}>NAHID</Text>
           </View>
           
           {isConnecting && (
             <ActivityIndicator color="#3b82f6" size="large" style={styles.loader} />
           )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              onPress={handleToggleConnect} 
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>আবার চেষ্টা করুন (RETRY)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.transcriptContainer}>
          <ScrollView contentContainerStyle={styles.transcriptList}>
             {voiceTranscript.slice(-3).map((item, index) => (
               <View key={index} style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                 <Text style={styles.bubbleText}>{item.text}</Text>
               </View>
             ))}
          </ScrollView>
        </View>

        {isConnected && isOfflineMode && (
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="অফলাইনে চ্যাট করুন..."
              placeholderTextColor="#64748b"
              value={textInput}
              onChangeText={setTextInput}
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Send color="white" size={18} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomControls}>
          <TouchableOpacity 
            onPress={() => {
              triggerHaptic();
              setIsChatMode(true);
            }}
            style={styles.chatEntryButton}
          >
            <MessageSquare color="#a78bfa" size={28} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleToggleConnect}
            style={[styles.mainButton, isConnected ? styles.mainButtonActive : null]}
          >
            {isConnecting ? (
              <ActivityIndicator color="white" />
            ) : isConnected ? (
              <X color="white" size={32} />
            ) : (
              <Mic color="white" size={32} />
            )}
          </TouchableOpacity>
          
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.instructionText}>
          {isConnected ? 'কথা বলা বন্ধ করতে বাটনে প্রেস করুন' : 'ভয়েস এআই চালু করতে মাইক্রোফোনে প্রেস করুন'}
        </Text>
      </View>

      <ActionOverlay action={latestAction} />
      
      {/* Chat Screen Overlay */}
      {isChatMode && (
        <View style={styles.chatOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setIsChatMode(false)} style={styles.iconButton}>
                <ArrowLeft color="#94a3b8" size={24} />
              </TouchableOpacity>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderText}>{assistantName} Chat</Text>
                <Text style={styles.chatHeaderStatus}>{isConnected ? 'LIVE ENGINE • ONLINE' : 'ENGINE OFFLINE'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={startNewChatNative} style={styles.iconButton}>
                  <Plus color="#3b82f6" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages Area */}
            <ScrollView 
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              style={styles.chatList}
              contentContainerStyle={{ padding: 20 }}
            >
              {chatTranscript.length === 0 && !streamingResponse && (
                <View style={styles.emptyChat}>
                   <View style={styles.emptyIconContainer}>
                      <Bot color="#3b82f6" size={40} opacity={0.2} />
                   </View>
                   <Text style={styles.emptyChatText}>INITIATE COMMUNICATION</Text>
                </View>
              )}

              {chatTranscript.map((msg, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.chatBubble, 
                    msg.role === 'user' ? styles.userChatBubble : styles.modelChatBubble,
                    { marginBottom: 24 }
                  ]}
                >
                  <Text style={styles.chatBubbleText}>{msg.text}</Text>
                  
                  {msg.role === 'model' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 18, gap: 8 }}>
                        <TouchableOpacity 
                          onPress={() => handleCopyNative(msg.text, index)}
                          style={[
                            styles.speakerButton,
                            { backgroundColor: copiedIndexNative === index ? '#22c55e' : 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                          ]}
                        >
                          <Text style={{ fontSize: 8, color: 'white', fontWeight: 'bold' }}>
                            {copiedIndexNative === index ? 'কপি করা হয়েছে' : 'COPY'}
                          </Text>
                        </TouchableOpacity>
                      
                      <View style={{ 
                        flexDirection: 'row', 
                        backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                        borderRadius: 12, 
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)'
                      }}>
                        <TouchableOpacity 
                          onPress={() => speakText(msg.text, index)}
                          style={[
                            styles.speakerButton,
                            { borderRadius: 0, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
                            speakingMessageIndex === index && !isSpeechPaused && { backgroundColor: '#3b82f6' },
                            speakingMessageIndex === index && isSpeechPaused && { backgroundColor: 'rgba(245, 158, 11, 0.2)' }
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {speakingMessageIndex === index && !isSpeechPaused ? (
                              <AudioLines color="white" size={14} />
                            ) : (
                              speakingMessageIndex === index && isSpeechPaused ? (
                                <Play color="#f59e0b" size={14} />
                              ) : (
                                <Volume2 color="#94a3b8" size={14} />
                              )
                            )}
                            <Text style={{ 
                              fontSize: 9, 
                              fontWeight: 'bold', 
                              color: speakingMessageIndex === index ? (isSpeechPaused ? '#f59e0b' : 'white') : '#94a3b8',
                              textTransform: 'uppercase'
                            }}>
                              {speakingMessageIndex === index ? (isSpeechPaused ? 'RESUME' : 'PAUSE') : 'LISTEN'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => speakText(msg.text, index, true)}
                          style={[
                            styles.speakerButton,
                            { borderRadius: 0, paddingHorizontal: 10, height: 32, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }
                          ]}
                        >
                          <Text style={{ fontSize: 13, color: '#94a3b8' }}>↺</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {streamingResponse ? (
                <View style={[styles.chatBubble, styles.modelChatBubble, { marginBottom: 24 }]}>
                  <View style={styles.bubbleBotIcon}>
                    <Bot color="#3b82f6" size={12} />
                  </View>
                  <Text style={styles.chatBubbleText}>{streamingResponse}</Text>
                </View>
              ) : null}
              
              {isChatLoading && !streamingResponse && (
                <View style={[styles.typingIndicator, { marginBottom: 24 }]}>
                   <View style={styles.typingDot} />
                   <View style={[styles.typingDot, { opacity: 0.7 }]} />
                   <View style={[styles.typingDot, { opacity: 0.4 }]} />
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.chatInputWrapper}
            >
              <View style={styles.chatInputBar}>
                <TextInput
                  style={[styles.chatTextInput, { maxHeight: 120 }]}
                  placeholder="পড়াশোনা বা যেকোনো প্রশ্ন করো..."
                  placeholderTextColor="#475569"
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline={true}
                  blurOnSubmit={false}
                  editable={!isChatLoading}
                />
                
                <TouchableOpacity 
                   onPress={() => setShowFullEditorNative(true)} 
                   style={{ padding: 10 }}
                >
                  <Maximize2 color="#64748b" size={16} />
                </TouchableOpacity>

                <TouchableOpacity 
                   onPress={handleSendMessage}
                   disabled={isChatLoading || !textInput.trim()}
                   style={[styles.chatSendButton, (isChatLoading || !textInput.trim()) && { opacity: 0.5 }]}
                >
                  {isChatLoading ? <ActivityIndicator color="white" size="small" /> : <Send color="white" size={20} />}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>

            {/* Full Editor Modal Native */}
            <Modal
              visible={showFullEditorNative}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setShowFullEditorNative(false)}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
                 <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Full Editor</Text>
                    <TouchableOpacity onPress={() => setShowFullEditorNative(false)} style={styles.iconButton}>
                       <X color="white" size={24} />
                    </TouchableOpacity>
                 </View>
                 <TextInput
                   style={styles.modalTextInput}
                   multiline
                   autoFocus
                   value={textInput}
                   onChangeText={setTextInput}
                   placeholder="পড়াশোনা বা যেকোনো প্রশ্ন করো..."
                   placeholderTextColor="#475569"
                 />
                 <View style={styles.modalFooter}>
                    <TouchableOpacity 
                      onPress={() => setShowFullEditorNative(false)} 
                      style={[styles.modalButton, { backgroundColor: '#1e293b' }]}
                    >
                       <Text style={styles.modalButtonText}>বন্ধ করুন</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        handleSendMessage();
                        setShowFullEditorNative(false);
                      }} 
                      style={[styles.modalButton, { backgroundColor: '#3b82f6' }]}
                    >
                       <Text style={styles.modalButtonText}>পাঠান</Text>
                    </TouchableOpacity>
                 </View>
              </SafeAreaView>
            </Modal>
          </SafeAreaView>
        </View>
      )}

      {/* Basic Settings Overlay (Simplified for conversion) */}
      {showSettings && (
        <View style={styles.overlay}>
           <SafeAreaView style={styles.overlayContent}>
              <View style={styles.header}>
                 <TouchableOpacity onPress={() => setShowSettings(false)}>
                   <ArrowLeft color="white" size={24} />
                 </TouchableOpacity>
                 <Text style={styles.headerTitle}>সেটিংস</Text>
                 <View style={{ width: 24 }} />
              </View>
              <ScrollView style={styles.settingsScroll}>
                 <View style={styles.settingsGroup}>
                    <Text style={styles.groupLabel}>AI Profile</Text>
                    <View style={styles.fieldRow}>
                       <User color="#64748b" size={16} />
                       <View style={styles.fieldContent}>
                          <Text style={styles.inputLabel}>Assistant Name</Text>
                          <Text style={styles.inputValue}>{assistantName}</Text>
                       </View>
                    </View>
                 </View>

                 <View style={styles.settingsGroup}>
                    <Text style={styles.groupLabel}>অফলাইন কনফিগারেশন</Text>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setShowSettings(false);
                        setShowModels(true);
                      }}
                    >
                       <View style={styles.menuItemLeft}>
                          <Database color="#3b82f6" size={18} />
                          <Text style={styles.menuItemText}>লোকাল এআই মডেল ম্যানেজার</Text>
                       </View>
                       <CheckCircle color={true ? "#4ade80" : "#64748b"} size={16} />
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                       <View style={styles.menuItemLeft}>
                          <CloudOff color="#94a3b8" size={18} />
                          <Text style={styles.menuItemText}>ফোর্স অফলাইন মোড</Text>
                       </View>
                       <TouchableOpacity 
                         onPress={() => {
                           const newVal = !isOfflineMode;
                           setIsOfflineMode(newVal);
                           AsyncStorage.setItem('nahid_offline_mode', newVal.toString());
                         }}
                         style={[styles.toggleBase, isOfflineMode && styles.toggleActive]}
                       >
                         <View style={[styles.toggleThumb, isOfflineMode && styles.toggleThumbActive]} />
                       </TouchableOpacity>
                    </View>
                 </View>

                 <Text style={styles.noteText}>রিয়েল অফলাইন এআই পেতে প্রথমে মডেল ম্যানেজার থেকে ১.৩৫ জিবি ডাটা ডাউনলোড করে নিন।</Text>
                 
                 <TouchableOpacity 
                   style={styles.diagButton} 
                   onPress={() => setShowDiagnostics(true)}
                 >
                    <Info color="#3b82f6" size={16} />
                    <Text style={styles.diagButtonText}>সিস্টেম ডায়াগনস্টিকস (Proof of Work)</Text>
                 </TouchableOpacity>

                 <View style={styles.settingsGroup}>
                    <Text style={styles.groupLabel}>System Agent (Agentic Control)</Text>
                    <View style={styles.agentCard}>
                       <View style={styles.agentHeader}>
                          <View style={styles.agentStatusBadge}>
                             <View style={[styles.statusDot, { backgroundColor: engineStatus?.isAccessibilityActive ? '#4ade80' : '#f87171' }]} />
                             <Text style={styles.statusLabel}>
                                {engineStatus?.isAccessibilityActive ? 'SERVICE ACTIVE' : 'SERVICE OFF'}
                             </Text>
                          </View>
                          <Zap color="#eab308" size={20} />
                       </View>
                       
                       <Text style={styles.agentDescription}>
                          অ্যাক্সেসিবিলিটি সার্ভিস অন করলে এআই আপনার স্ক্রিন দেখতে এবং অন্য অ্যাপ (যেমন ডাটা অন/অফ, কল, মেসেজ) কন্ট্রোল করতে পারবে।
                       </Text>

                       <TouchableOpacity 
                         style={styles.permissionButton}
                         onPress={async () => {
                           if (NahidOfflineAI) {
                             try { await NahidOfflineAI.openAccessibilitySettings(); } catch(e) {}
                           } else {
                             Alert.alert("Native Only", "অ্যাক্সেসিবিলিটি কন্ট্রোল শুধুমাত্র অ্যান্ড্রয়েড এপিকে (APK) ভার্সনে কাজ করবে।");
                           }
                         }}
                       >
                          <Text style={styles.permissionButtonText}>গ্র্যান্ট পারমিশন (OPEN SETTINGS)</Text>
                       </TouchableOpacity>
                    </View>
                 </View>
              </ScrollView>
           </SafeAreaView>
        </View>
      )}

      {/* History Overlay */}
      {showHistory && (
        <View style={styles.historyOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.iconButton}>
                <ArrowLeft color="white" size={24} />
              </TouchableOpacity>
              <Text style={styles.chatHeaderText}>Conversation History</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 20 }}
            >
              {history.length > 0 ? (
                history.map((item, idx) => (
                  <TouchableOpacity 
                    key={`${item.id}-${idx}`} 
                    style={styles.historyItem}
                    onPress={() => {
                      setSelectedSession(item);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                      {item.type && (
                        <View style={[
                          styles.sessionTag, 
                          { backgroundColor: item.type === 'chat' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)' }
                        ]}>
                           <Text style={[
                             styles.sessionTagText, 
                             { color: item.type === 'chat' ? '#3b82f6' : '#f59e0b' }
                           ]}>
                             {item.type === 'chat' ? 'TEXT' : 'VOICE'}
                           </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.emptyChat, { marginTop: 100 }]}>
                  <History color="#3b82f6" size={40} opacity={0.1} />
                  <Text style={[styles.emptyChatText, { marginTop: 20 }]}>NO HISTORY FOUND</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}

      {/* History Detail Overlay */}
      {selectedSession && (
        <View style={styles.historyDetailOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setSelectedSession(null)} style={styles.iconButton}>
                <ArrowLeft color="white" size={24} />
              </TouchableOpacity>
              <Text style={styles.chatHeaderText}>Session Details</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.historyDetailScroll}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.historyDetailTitle}>{selectedSession.title}</Text>
                <View style={[
                  styles.sessionTag, 
                  { backgroundColor: selectedSession.type === 'chat' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)' }
                ]}>
                    <Text style={[
                      styles.sessionTagText, 
                      { color: selectedSession.type === 'chat' ? '#3b82f6' : '#f59e0b' }
                    ]}>
                      {selectedSession.type === 'chat' ? 'TEXT CHAT' : 'VOICE CHAT'}
                    </Text>
                </View>
              </View>

              {selectedSession.transcript.map((msg: any, i: number) => (
                <View key={i} style={[styles.msgBubble, msg.role === 'user' ? styles.userMsg : styles.modelMsg]}>
                  <Text style={styles.msgLabel}>{msg.role === 'user' ? 'You' : 'Assistant'}</Text>
                  <Text style={styles.msgText}>{msg.text}</Text>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.resumeButton}
                onPress={() => {
                  const isText = selectedSession.type === 'chat';
                  setShowHistory(false);
                  
                  if (isText) {
                    setChatTranscript(selectedSession.transcript);
                    currentChatSessionIdRef.current = selectedSession.id;
                    setCurrentChatSessionId(selectedSession.id);
                    setIsChatMode(true);
                  } else {
                    setIsChatMode(false);
                    connect(assistantName, assistantVoice, isOfflineMode);
                  }
                  setSelectedSession(null);
                }}
              >
                <Zap size={20} color="#3b82f6" />
                <Text style={styles.resumeButtonText}>আবার শুরু করুন (Resume Chat)</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}

      {/* SYSTME DIAGNOSTICS OVERLAY */}
      {showDiagnostics && (
        <View style={styles.overlay}>
           <SafeAreaView style={styles.overlayContent}>
              <View style={styles.header}>
                 <TouchableOpacity onPress={() => setShowDiagnostics(false)}>
                   <ArrowLeft color="white" size={24} />
                 </TouchableOpacity>
                 <Text style={styles.headerTitle}>সিস্টেম ডায়াগনস্টিকস</Text>
                 <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={styles.settingsScroll}>
                 <View style={styles.diagCard}>
                    <Text style={styles.diagTitle}>Native Module Bridge</Text>
                    <View style={styles.diagRow}>
                       <Text style={styles.diagLabel}>Module Status:</Text>
                       <Text style={[styles.diagValue, { color: engineStatus?.isNative ? '#4ade80' : '#f87171' }]}>
                          {engineStatus?.isNative ? 'CONNECTED (Native)' : engineStatus?.reason || 'DISCONNECTED'}
                       </Text>
                    </View>
                    
                    {engineStatus?.isNative && (
                       <>
                          <View style={styles.diagRow}>
                             <Text style={styles.diagLabel}>SDK Interface:</Text>
                             <Text style={styles.diagValue}>{engineStatus.sdkVersion}</Text>
                          </View>
                          <View style={styles.diagRow}>
                             <Text style={styles.diagLabel}>Model Target:</Text>
                             <Text style={styles.diagValue}>{engineStatus.modelType}</Text>
                          </View>
                          <View style={styles.diagRow}>
                             <Text style={styles.diagLabel}>Model Installed:</Text>
                             <Text style={styles.diagValue}>{engineStatus.modelFileExists ? 'YES' : 'NO'}</Text>
                          </View>
                          {engineStatus.modelFileExists && (
                             <View style={styles.diagRow}>
                                <Text style={styles.diagLabel}>Model Byte Size:</Text>
                                <Text style={styles.diagValue}>{engineStatus.modelSize} bytes</Text>
                             </View>
                          )}
                          <View style={styles.diagRow}>
                             <Text style={styles.diagLabel}>Active Session:</Text>
                             <Text style={styles.diagValue}>{engineStatus.isInitialized ? 'ACTIVE' : 'IDLE'}</Text>
                          </View>
                          <View style={styles.diagRow}>
                             <Text style={styles.diagLabel}>Accessibility Service:</Text>
                             <Text style={[styles.diagValue, { color: engineStatus.isAccessibilityActive ? '#4ade80' : '#f87171' }]}>
                                {engineStatus.isAccessibilityActive ? 'ACTIVE' : 'OFF'}
                             </Text>
                          </View>
                       </>
                    )}
                 </View>
                 
                 <View style={styles.infoCard}>
                    <Info color="#3b82f6" size={16} />
                    <Text style={styles.infoText}>
                       এই ডায়াগনস্টিকস সরাসরি অ্যান্ড্রয়েড নেটিভ লেয়ার (`OfflineAIPlugin.java`) থেকে তথ্য সংগ্রহ করছে। ব্রাউজারে এটি "Simulator Mode" দেখাবে, কিন্তু APK বিল্ড করলে এটি রিয়েল নেটিভ হার্ডওয়্যার তথ্য দেখাবে।
                    </Text>
                 </View>
              </ScrollView>
           </SafeAreaView>
        </View>
      )}


    </SafeAreaView>
  );
}

function ActionOverlay({ action }: { action: any }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (action) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [action]);

  if (!visible) return null;
  
  return (
    <View 
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width / 2 - 25,
        top: height / 2 - 25,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(239, 68, 68, 0.4)',
        borderWidth: 2,
        borderColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  salamText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  orbContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  orbActive: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  orbSpeaking: {
    backgroundColor: '#1e3a8a',
    transform: [{ scale: 1.05 }],
  },
  orbText: {
    color: '#3b82f6',
    fontWeight: '900',
    letterSpacing: 4,
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
  },
  errorCard: {
    backgroundColor: '#ef444420',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef444440',
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryButtonText: {
    color: 'black',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptContainer: {
    height: 120,
    width: '100%',
    marginBottom: 40,
  },
  transcriptList: {
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-end',
  },
  modelBubble: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f640',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    color: 'white',
    fontSize: 12,
    lineHeight: 18,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  mainButtonActive: {
    backgroundColor: '#ef4444',
  },
  chatInputContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  chatEntryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f610',
    borderWidth: 1,
    borderColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  chatOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 200,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  chatHeaderInfo: {
    alignItems: 'center',
  },
  chatHeaderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  chatHeaderStatus: {
    color: '#3b82f6',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 4,
  },
  chatList: {
    flex: 1,
  },
  emptyChat: {
    flex: 1,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyChatText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
  },
  chatBubble: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    maxWidth: '85%',
  },
  userChatBubble: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  modelChatBubble: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleBotIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chatBubbleText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    padding: 16,
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    opacity: 0.5,
  },
  chatInputWrapper: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  chatTextInput: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 100,
  },
  overlayContent: {
    flex: 1,
  },
  settingsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsGroup: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  groupLabel: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldContent: {
    marginLeft: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  toggleBase: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  inputValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  diagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#3b82f610',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3b82f620',
  },
  diagButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },
  diagCard: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 20,
  },
  diagTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  diagLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  diagValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#3b82f610',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  infoText: {
    color: '#3b82f6',
    fontSize: 10,
    marginLeft: 10,
    flex: 1,
  },
  modalHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalTextInput: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    padding: 20,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  modalButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 300,
  },
  historyTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  historyDate: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  historyDetailOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 400,
  },
  historyDetailScroll: {
    flex: 1,
    padding: 20,
  },
  historyDetailTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
  },
  msgBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  modelMsg: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  msgLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  msgText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 18,
  },
  resumeButton: {
    height: 56,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
    gap: 10,
  },
  resumeButtonText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyItem: {
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sessionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sessionTagText: {
    fontSize: 8,
    fontWeight: '900',
  }
});
