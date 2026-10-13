package app.blackx.mobile;

import android.accounts.AccountManager;
import android.app.Dialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_PICK_GOOGLE_ACCOUNT = 9001;
    private Dialog oauthDialog = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableHighRefreshRate120Hz();
        configurePitchBlackWindow();
    }

    @Override
    public void onResume() {
        super.onResume();
        enableHighRefreshRate120Hz();
        configurePitchBlackWindow();
    }

    /**
     * Intercept hardware & gesture navigation bar Back button on Android 12/13/14/15 (CMF Phone 1)
     * so pressing Back navigates inside the app instead of closing the app!
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event != null && event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_UP) {
                triggerJsBackNavigation();
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        triggerJsBackNavigation();
    }

    private void triggerJsBackNavigation() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().evaluateJavascript(
                    "if(window.__bxHardwareBack){window.__bxHardwareBack();}else if(window.history.length>1){window.history.back();}",
                    null
                );
            }
        } catch (Exception ignored) {
        }
    }

    /**
     * Called from JS only when user is on Home root and double-presses Back to exit
     */
    @JavascriptInterface
    public void exitApp() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    finish();
                } catch (Exception ignored) {
                }
            }
        });
    }

    /**
     * True Edge-to-Edge Immersive Fullscreen & Landscape Control for Anime Video & Manhwa Reader
     */
    @JavascriptInterface
    public void setFullscreen(final boolean fullscreen, final boolean landscape) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Window window = getWindow();
                    if (window != null) {
                        WindowManager.LayoutParams params = window.getAttributes();
                        if (Build.VERSION.SDK_INT >= 28 && params != null) {
                            // LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES = 1
                            params.layoutInDisplayCutoutMode = fullscreen ? 1 : 0;
                            window.setAttributes(params);
                        }
                        View decor = window.getDecorView();
                        if (fullscreen) {
                            // FLAG_FULLSCREEN (1024) | FLAG_KEEP_SCREEN_ON (128)
                            window.addFlags(1024 | 128);
                            if (decor != null) {
                                // IMMERSIVE_STICKY(4096) | FULLSCREEN(4) | HIDE_NAVIGATION(2) | LAYOUT_STABLE(256) | LAYOUT_HIDE_NAVIGATION(512) | LAYOUT_FULLSCREEN(1024)
                                decor.setSystemUiVisibility(5894);
                            }
                        } else {
                            window.clearFlags(1024 | 128);
                            if (decor != null) {
                                decor.setSystemUiVisibility(0);
                            }
                        }
                    }
                    if (fullscreen && landscape) {
                        // SCREEN_ORIENTATION_SENSOR_LANDSCAPE = 6
                        setRequestedOrientation(6);
                    } else {
                        // SCREEN_ORIENTATION_UNSPECIFIED = -1
                        setRequestedOrientation(-1);
                    }
                } catch (Exception ignored) {
                }
            }
        });
    }

    private void enableHighRefreshRate120Hz() {
        try {
            Window window = getWindow();
            if (window == null) return;
            WindowManager.LayoutParams params = window.getAttributes();
            params.preferredRefreshRate = 120.0f;
            if (Build.VERSION.SDK_INT >= 28) {
                params.layoutInDisplayCutoutMode = 1;
            }
            if (Build.VERSION.SDK_INT >= 23) {
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode currentMode = display.getMode();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode bestMode = currentMode;
                for (int i = 0; i < modes.length; i++) {
                    Display.Mode m = modes[i];
                    if (m.getPhysicalWidth() == currentMode.getPhysicalWidth()
                        && m.getPhysicalHeight() == currentMode.getPhysicalHeight()
                        && m.getRefreshRate() > bestMode.getRefreshRate()) {
                        bestMode = m;
                    }
                }
                params.preferredDisplayModeId = bestMode.getModeId();
            }
            window.setAttributes(params);
        } catch (Exception ignored) {
        }
    }

    private static String buildCleanChromeUserAgent(String rawUa) {
        if (rawUa == null || rawUa.isEmpty()) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
        }
        String cleaned = rawUa.replace("; wv)", ")").replace("; wv;", ";").replace(" wv ", " ");
        cleaned = cleaned.replaceAll("Version/\\d+\\.\\d+\\s*", "");
        return cleaned;
    }

    private void configurePitchBlackWindow() {
        try {
            Window window = getWindow();
            int black = 0xFF000000;
            if (window != null) {
                window.setStatusBarColor(black);
                window.setNavigationBarColor(black);
                window.getDecorView().setBackgroundColor(black);
            }
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                webView.setBackgroundColor(black);
                webView.setLayerType(2, null);
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setMixedContentMode(0);
                settings.setUserAgentString(buildCleanChromeUserAgent(settings.getUserAgentString()));
                if (Build.VERSION.SDK_INT >= 23) {
                    settings.setOffscreenPreRaster(true);
                }
                webView.addJavascriptInterface(this, "BlackXNativeAuth");
            }
        } catch (Exception ignored) {
        }
    }

    /**
     * Native Android System Google Account Picker:
     * Opens the phone's built-in Google account chooser listing all Google accounts
     * already signed in on the device without typing email/password.
     */
    @JavascriptInterface
    public void pickPhoneGoogleAccount(final String fallbackAuthUrl) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent intent = AccountManager.newChooseAccountIntent(
                        null,
                        null,
                        new String[]{"com.google"},
                        true,
                        null,
                        null,
                        null,
                        null
                    );
                    if (intent != null) {
                        startActivityForResult(intent, REQ_PICK_GOOGLE_ACCOUNT);
                        return;
                    }
                } catch (Exception ignored) {
                }
                if (fallbackAuthUrl != null && !fallbackAuthUrl.isEmpty()) {
                    startGoogleLogin(fallbackAuthUrl);
                } else {
                    deliverOAuthErrorToJs("picker_unavailable");
                }
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_PICK_GOOGLE_ACCOUNT) {
            if (resultCode == -1 && data != null) {
                String email = data.getStringExtra("authAccount");
                if (email != null && !email.isEmpty()) {
                    deliverPhoneGoogleAccountToJs(email);
                    return;
                }
            }
            deliverOAuthErrorToJs("user_cancelled");
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @JavascriptInterface
    public void startGoogleLogin(final String authUrl) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (oauthDialog != null) {
                        try { oauthDialog.dismiss(); } catch (Exception ignored) {}
                        oauthDialog = null;
                    }
                    final Dialog dialog = new Dialog(MainActivity.this, 16973834);
                    oauthDialog = dialog;
                    Window w = dialog.getWindow();
                    if (w != null) {
                        w.requestFeature(1);
                        w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
                        w.setStatusBarColor(0xFF000000);
                        w.setNavigationBarColor(0xFF000000);
                    }
                    WebView oauthWebView = new WebView(MainActivity.this);
                    oauthWebView.setBackgroundColor(0xFF000000);
                    WebSettings s = oauthWebView.getSettings();
                    s.setJavaScriptEnabled(true);
                    s.setDomStorageEnabled(true);
                    s.setDatabaseEnabled(true);
                    s.setJavaScriptCanOpenWindowsAutomatically(true);
                    s.setUserAgentString(buildCleanChromeUserAgent(s.getUserAgentString()));

                    CookieManager cm = CookieManager.getInstance();
                    if (cm != null) {
                        cm.setAcceptCookie(true);
                        if (Build.VERSION.SDK_INT >= 21) {
                            cm.setAcceptThirdPartyCookies(oauthWebView, true);
                        }
                    }

                    oauthWebView.setWebViewClient(new WebViewClient() {
                        private boolean completed = false;

                        private boolean handleUrl(String url) {
                            if (url == null || completed) return false;
                            if (url.startsWith("https://spry-oxide-1h7sp.firebaseapp.com/__/auth/handler")
                                || url.startsWith("http://localhost/__/auth/handler")
                                || url.startsWith("https://localhost/__/auth/handler")) {
                                completed = true;
                                try {
                                    if (oauthDialog != null) {
                                        oauthDialog.dismiss();
                                        oauthDialog = null;
                                    }
                                } catch (Exception ignored) {}
                                deliverOAuthRedirectToJs(url);
                                return true;
                            }
                            return false;
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            if (request != null && request.getUrl() != null) {
                                if (handleUrl(request.getUrl().toString())) return true;
                            }
                            return false;
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, String url) {
                            if (handleUrl(url)) return true;
                            return false;
                        }

                        @Override
                        public void onPageStarted(WebView view, String url, Bitmap favicon) {
                            if (handleUrl(url)) return;
                            super.onPageStarted(view, url, favicon);
                        }
                    });

                    dialog.setCancelable(true);
                    dialog.setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface d) {
                            deliverOAuthErrorToJs("user_cancelled");
                        }
                    });

                    dialog.setContentView(
                        oauthWebView,
                        new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    );
                    dialog.show();
                    oauthWebView.loadUrl(authUrl);
                } catch (Exception e) {
                    deliverOAuthErrorToJs(e.getMessage());
                }
            }
        });
    }

    private void deliverPhoneGoogleAccountToJs(String email) {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String safe = email.replace("\\", "\\\\").replace("'", "\\'");
                String js = "window.__onBlackXPhoneGoogleAccountPicked && window.__onBlackXPhoneGoogleAccountPicked('" + safe + "');";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception ignored) {
        }
    }

    private void deliverOAuthRedirectToJs(String redirectUrl) {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                String safe = redirectUrl.replace("\\", "\\\\").replace("'", "\\'");
                String js = "window.__onBlackXGoogleOAuthRedirect && window.__onBlackXGoogleOAuthRedirect('" + safe + "');";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception ignored) {
        }
    }

    private void deliverOAuthErrorToJs(String err) {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                if (err == null) err = "error";
                String safe = err.replace("\\", "\\\\").replace("'", "\\'");
                String js = "window.__onBlackXGoogleOAuthError && window.__onBlackXGoogleOAuthError('" + safe + "');";
                this.bridge.getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception ignored) {
        }
    }
}
