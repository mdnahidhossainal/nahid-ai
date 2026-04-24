package com.nahidai.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

public class NahidAccessibilityService extends AccessibilityService {
    private static final String TAG = "NahidAccessibility";
    private static NahidAccessibilityService instance;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // We can capture screen content changes here if needed
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility Service Interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "Accessibility Service Connected");
    }

    public static NahidAccessibilityService getInstance() {
        return instance;
    }

    // Capture the entire UI hierarchy as a string
    public String getScreenContents() {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return "No active window content";
        
        StringBuilder sb = new StringBuilder();
        dumpNode(rootNode, sb, 0);
        return sb.toString();
    }

    private void dumpNode(AccessibilityNodeInfo node, StringBuilder sb, int depth) {
        if (node == null) return;
        
        for (int i = 0; i < depth; i++) sb.append("  ");
        
        sb.append("[").append(node.getClassName()).append("] ");
        if (node.getText() != null) sb.append("Text: \"").append(node.getText()).append("\" ");
        if (node.getViewIdResourceName() != null) sb.append("ID: ").append(node.getViewIdResourceName()).append(" ");
        if (node.getContentDescription() != null) sb.append("Desc: ").append(node.getContentDescription()).append(" ");
        sb.append("\n");

        for (int i = 0; i < node.getChildCount(); i++) {
            dumpNode(node.getChild(i), sb, depth + 1);
        }
    }

    public boolean performClick(String viewId) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return false;
        
        List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByViewId(viewId);
        if (nodes != null && !nodes.isEmpty()) {
            return nodes.get(0).performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        return false;
    }

    public boolean performGlobalAction(int action) {
        return performGlobalAction(action);
    }
}
