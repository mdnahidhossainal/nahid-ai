import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
const docDir = (FileSystem as any).documentDirectory;
const cacheDir = (FileSystem as any).cacheDirectory;
const encodingBase64 = (FileSystem as any).EncodingType?.Base64;
import { Database, Trash2, Download, CheckCircle, HardDrive, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// REAL STRONGEST MODEL CONFIGURATION (Gemma 2 2B IT)
const MODELS = [
  {
    id: 'gemma-2-2b-it',
    name: 'Gemma 2 2B IT (Google)',
    version: '2.0 (Latest)',
    sizeDisplay: '1.60 GB',
    sizeBytes: 1600000000,
    // Real direct link from Google's official HuggingFace repo
    url: 'https://huggingface.co/google/gemma-2-2b-it-tflite/resolve/main/gemma-2-2b-it-gpu-int4.bin',
    description: 'এটি Google-এর লেটেস্ট এবং সবচেয়ে শক্তিশালী ছোট মডেল। এতে আগের ভার্সনের চেয়ে অনেক বেশি বুদ্ধিমত্তা এবং বাংলা বোঝার ক্ষমতা রয়েছে। হার্ডওয়্যার এক্সিলারেশন সহ এটি অফলাইনে চলে।'
  }
];

export function LocalModelManager() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [storageInfo, setStorageInfo] = useState({ free: 0, total: 0 });

  useEffect(() => {
    checkInstalledModels();
    updateStorageInfo();
  }, []);

  const isNative = !!(FileSystem as any).documentDirectory;

  const updateStorageInfo = async () => {
    try {
      if (isNative) {
        const free = await FileSystem.getFreeDiskStorageAsync();
        const total = await FileSystem.getTotalDiskCapacityAsync();
        setStorageInfo({ free, total });
      } else {
        // Mock for simulator
        setStorageInfo({ free: 50 * 1024 * 1024 * 1024, total: 128 * 1024 * 1024 * 1024 });
      }
    } catch (e) {
      console.warn("Storage info failed", e);
    }
  };

  const checkInstalledModels = async () => {
    if (!docDir) return;
    
    const modelDir = docDir + 'models/';
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    }
    
    const gemmaFile = modelDir + 'gemma-2-2b-it.bin';
    const fileInfo = await FileSystem.getInfoAsync(gemmaFile);
    if (fileInfo.exists) {
      setInstalledModels(['gemma-2-2b-it']);
    } else {
      setInstalledModels([]);
    }
  };

  const downloadModel = async (model: typeof MODELS[0]) => {
    if (!docDir) {
      Alert.alert('ত্রুটি', 'ফাইল সিস্টেম এক্সেস করা যাচ্ছে না।');
      return;
    }

    setDownloading(true);
    setProgress(0);
    
    const uri = model.url;
    const modelDir = docDir + 'models/';
    const modelPath = modelDir + model.id + '.bin';
    
    // Ensure Directory
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    }

    // REAL DOWNLOAD LOGIC
    const downloadResumable = FileSystem.createDownloadResumable(
      uri,
      modelPath,
      {},
      (downloadProgress) => {
        const p = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setProgress(p);
        setDownloadSpeed(`${(downloadProgress.totalBytesWritten / 1024 / 1024).toFixed(1)} MB ডাউনলোড হয়েছে`);
      }
    );

    try {
      if (!isNative) {
        // Browser Simulator Logic
        for(let i=0; i<=100; i+=5) {
          setProgress(i/100);
          setDownloadSpeed(`Simulator: ${i}% (Real download only on Android)`);
          await new Promise(r => setTimeout(r, 100));
        }
        Alert.alert('Simulator Notice', 'এটি একটি ব্রাউজার প্রিভিউ। রিয়েল ১.৬০ জিবি মডেল ডাউনলোড শুধুমাত্র অ্যান্ড্রয়েড ফোনে এপিকে ইনস্টল করলে কাজ করবে।');
        return;
      }

      const result = await downloadResumable.downloadAsync();
      if (result) {
        setInstalledModels([...installedModels, model.id]);
        Alert.alert('সফল', 'Gemma মডেলটি সফলভাবে ডাউনলোড এবং ইনস্টল করা হয়েছে।');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('ত্রুটি', 'ডাউনলোড ব্যর্থ হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setDownloading(false);
      updateStorageInfo();
    }
  };

  const deleteModel = async (id: string) => {
    Alert.alert(
      'মডেল ডিলিট',
      'আপনি কি নিশ্চিত যে ১.৩৫ জিবি ওজনের এই মডেলটি ডিলিট করতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        { 
          text: 'ডিলিট করুন', 
          style: 'destructive',
          onPress: async () => {
            if (!docDir) return;
            const modelPath = docDir + 'models/' + id + '.bin';
            await FileSystem.deleteAsync(modelPath);
            setInstalledModels(installedModels.filter(m => m !== id));
            updateStorageInfo();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Storage Header */}
      <View style={styles.storageCard}>
        <View style={styles.row}>
          <HardDrive color="#3b82f6" size={20} />
          <Text style={styles.cardTitle}>স্টোরেজ ইউসেজ</Text>
        </View>
        <Text style={styles.storageText}>
          ফ্রি: {(storageInfo.free / 1024 / 1024 / 1024).toFixed(2)} GB / মোট: {(storageInfo.total / 1024 / 1024 / 1024).toFixed(2)} GB
        </Text>
        <Text style={styles.pathText}>Data Path: {docDir}models/</Text>
      </View>

      <Text style={styles.sectionTitle}>অফলাইন এআই মডেল</Text>

      {MODELS.map(model => {
        const isInstalled = installedModels.includes(model.id);
        
        return (
          <View key={model.id} style={styles.modelCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.versionText}>Family: Gemma | Size: {model.sizeDisplay}</Text>
              </View>
              {isInstalled ? (
                <CheckCircle color="#4ade80" size={24} />
              ) : (
                <Database color="#64748b" size={24} />
              )}
            </View>

            <Text style={styles.descText}>{model.description}</Text>

            {downloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <Text style={styles.progressText}>{Math.round(progress * 100)}% - {downloadSpeed}</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              {isInstalled ? (
                <TouchableOpacity onPress={() => deleteModel(model.id)} style={styles.deleteBtn}>
                  <Trash2 color="#f87171" size={16} />
                  <Text style={styles.deleteBtnText}>Uninstall</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => !downloading && downloadModel(model)} 
                  style={[styles.downloadBtn, downloading && styles.disabledBtn]}
                  disabled={downloading}
                >
                  <Download color="white" size={16} />
                  <Text style={styles.downloadBtnText}>{downloading ? 'ইনস্টল হচ্ছে...' : 'মডেল ডাউনলোড করুন'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.infoCard}>
        <Info color="#3b82f6" size={16} />
        <View style={{ flex: 1, marginLeft: 10 }}>
           <Text style={styles.infoText}>
             এই মডেলটি সরাসরি Google-এর Hugging Face রিপোজিটরি থেকে আপনার ফোনের লোকাল স্টোরেজে ডাউনলোড হবে।
           </Text>
           <Text style={styles.urlText}>Source URL: {MODELS[0].url}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000',
  },
  storageCard: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storageText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  pathText: {
    color: '#475569',
    fontSize: 8,
    marginTop: 10,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 15,
  },
  modelCard: {
    backgroundColor: '#0f172a',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  descText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  progressContainer: {
    height: 34,
    backgroundColor: '#020617',
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    position: 'absolute',
  },
  progressText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    zIndex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef444420',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#3b82f610',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 80,
  },
  infoText: {
    color: '#3b82f6',
    fontSize: 10,
  },
  urlText: {
    color: '#475569',
    fontSize: 7,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
