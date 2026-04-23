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
  Platform
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
  Brain
} from 'lucide-react-native';
import { useLiveSessionNative } from './src/hooks/useLiveSessionNative';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function NativeApp() {
  const { 
    isConnected, 
    isConnecting, 
    isSpeaking, 
    error, 
    transcript, 
    connect, 
    disconnect 
  } = useLiveSessionNative();

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [assistantName, setAssistantName] = useState('Nahid AI');
  const [assistantVoice, setAssistantVoice] = useState('Puck');

  useEffect(() => {
    // Load settings on startup
    const loadSettings = async () => {
      const savedName = await AsyncStorage.getItem('nahid_assistant_name');
      const savedVoice = await AsyncStorage.getItem('nahid_voice');
      if (savedName) setAssistantName(savedName);
      if (savedVoice) setAssistantVoice(savedVoice);
    };
    loadSettings();
  }, []);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToggleConnect = () => {
    triggerHaptic();
    if (isConnected) {
      disconnect();
    } else {
      connect(assistantName, assistantVoice);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.iconButton}>
          <History color="white" size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
           <Text style={styles.headerTitle}>{assistantName}</Text>
           <View style={styles.statusBadge}>
             <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ade80' : '#475569' }]} />
             <Text style={styles.statusText}>{isConnected ? 'Active' : 'Offline'}</Text>
           </View>
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}>
          <SettingsIcon color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Main Content - Voice Interface */}
      <View style={styles.mainContent}>
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
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
                    <View style={styles.inputContainer}>
                       <Text style={styles.inputLabel}>Assistant Name</Text>
                       <Text style={styles.inputValue}>{assistantName}</Text>
                    </View>
                 </View>
                 <Text style={styles.noteText}>নেটিভ অ্যাপের পূর্ণ সুবিধা পেতে Replit-এ প্রোজেক্টটি ডেপলয় করুন।</Text>
              </ScrollView>
           </SafeAreaView>
        </View>
      )}

    </SafeAreaView>
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
  errorContainer: {
    backgroundColor: '#ef444420',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef444440',
    marginBottom: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 10,
    textAlign: 'center',
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
  }
});
