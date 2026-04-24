package com.nahidai.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions;
import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.provider.Settings;
import java.io.File;

@CapacitorPlugin(name = "NahidOfflineAI")
public class OfflineAIPlugin extends Plugin {
    private LlmInference llmInference;

    @PluginMethod
    public void getScreenContent(PluginCall call) {
        NahidAccessibilityService service = NahidAccessibilityService.getInstance();
        if (service == null) {
            call.reject("Accessibility Service is not running. Please enable it in Settings.");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("content", service.getScreenContents());
        call.resolve(ret);
    }

    @PluginMethod
    public void performScreenAction(PluginCall call) {
        String type = call.getString("type"); // click, back, home, recents
        String viewId = call.getString("viewId");

        NahidAccessibilityService service = NahidAccessibilityService.getInstance();
        if (service == null) {
            call.reject("Accessibility Service is not running.");
            return;
        }

        boolean success = false;
        if ("click".equals(type)) {
            success = service.performClick(viewId);
        } else if ("back".equals(type)) {
            success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK);
        } else if ("home".equals(type)) {
            success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
        } else if ("recents".equals(type)) {
            success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS);
        } else if ("notifications".equals(type)) {
            success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS);
        } else if ("quicksettings".equals(type)) {
            success = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS);
        }

        JSObject ret = new JSObject();
        ret.put("success", success);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getEngineStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isNative", true);
        ret.put("sdkVersion", "MediaPipe 0.10.x");
        ret.put("modelType", "Gemma-2-2B-IT (Latest)");
        ret.put("isInitialized", llmInference != null);
        
        String modelPath = getContext().getFilesDir().getAbsolutePath() + "/models/gemma-2-2b-it.bin";
        File file = new File(modelPath);
        ret.put("modelFileExists", file.exists());
        if (file.exists()) {
            ret.put("modelSize", file.length());
        }
        
        ret.put("isAccessibilityActive", NahidAccessibilityService.getInstance() != null);
        
        call.resolve(ret);
    }

    @PluginMethod
    public void isModelInstalled(PluginCall call) {
        String modelPath = getContext().getFilesDir().getAbsolutePath() + "/models/gemma-2-2b-it.bin";
        File file = new File(modelPath);
        JSObject ret = new JSObject();
        ret.put("installed", file.exists());
        call.resolve(ret);
    }

    @PluginMethod
    public void initializeInference(PluginCall call) {
        try {
            String modelPath = getContext().getFilesDir().getAbsolutePath() + "/models/gemma-2-2b-it.bin";
            File file = new File(modelPath);
            
            if (!file.exists()) {
                call.reject("Model file not found. Please download it first.");
                return;
            }

            LlmInferenceOptions options = LlmInferenceOptions.builder()
                .setModelPath(modelPath)
                .setMaxTokens(1024)
                .setTopK(40)
                .setTemperature(0.7f)
                .setRandomSeed(101)
                .build();

            llmInference = LlmInference.createFromOptions(getContext(), options);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to initialize engine: " + e.getMessage());
        }
    }

    @PluginMethod
    public void generateResponse(PluginCall call) {
        String prompt = call.getString("prompt");
        if (llmInference == null) {
            call.reject("Engine not initialized");
            return;
        }

        try {
            // REAL OFFLINE INFERENCE START
            String result = llmInference.generateResponse(prompt);
            JSObject ret = new JSObject();
            ret.put("response", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Inference error: " + e.getMessage());
        }
    }
}
