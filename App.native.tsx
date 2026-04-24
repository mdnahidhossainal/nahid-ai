import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView
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
  Send
} from 'lucide-react-native';
import { useLiveSessionNative } from './src/hooks/useLiveSessionNative';
import { LocalModelManager } from './src/components/LocalModelManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';

const { width, height } = Dimensions.get('window');

export default function NativeApp() {
  const { 
    isConnected, 
    isConnecting, 
    isSpeaking, 
    error, 
    transcript, 
    connect, 
    disconnect,
    sendMessageOffline,
    engineStatus,
    latestAction
  } = useLiveSessionNative();

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [assistantName, setAssistantName] = useState('Nahid AI');
  const [assistantVoice, setAssistantVoice] = useState('Puck');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    // Load settings on startup
    const loadSettings = async () => {
      const savedName = await AsyncStorage.getItem('nahid_assistant_name');
      const savedVoice = await AsyncStorage.getItem('nahid_voice');
      const offlineMode = await AsyncStorage.getItem('nahid_offline_mode');
      if (savedName) setAssistantName(savedName);
      if (savedVoice) setAssistantVoice(savedVoice);
      if (offlineMode) setIsOfflineMode(offlineMode === 'true');
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

  const handleSendMessage = () => {
    if (!textInput.trim()) return;
    triggerHaptic();
    if (isOfflineMode) {
      sendMessageOffline(textInput);
    }
    setTextInput('');
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
             {transcript.slice(-3).map((item, index) => (
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

        <TouchableOpacity 
          onPress={handleToggleConnect}
          style={[styles.mainButton, isConnected ? styles.mainButtonActive : null]}
        >
          {isConnected ? (
            <X color="white" size={32} />
          ) : (
            <Mic color="white" size={32} />
          )}
        </TouchableOpacity>
        <Text style={styles.instructionText}>
          {isConnected ? 'অ্যাভাটারে ক্লিক করুন কথা শেষ করতে' : 'এআই স্টার্ট করতে প্রেস করুন'}
        </Text>
      </View>

      <ActionOverlay action={latestAction} />

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
  }
});
