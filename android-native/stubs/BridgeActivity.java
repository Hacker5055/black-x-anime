package com.getcapacitor;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
public class BridgeActivity extends Context {
    protected Bridge bridge;
    protected void onCreate(Bundle savedInstanceState) {}
    public void onResume() {}
    public void onBackPressed() {}
    public boolean dispatchKeyEvent(KeyEvent event) { return false; }
    public boolean onKeyDown(int keyCode, KeyEvent event) { return false; }
    public Window getWindow() { return null; }
    public WindowManager getWindowManager() { return null; }
    public void runOnUiThread(Runnable action) {}
    public void setRequestedOrientation(int requestedOrientation) {}
    public void startActivityForResult(Intent intent, int requestCode) {}
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {}
    public void enterPictureInPictureMode() {}
    public void finish() {}
}
