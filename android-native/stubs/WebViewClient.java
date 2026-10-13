package android.webkit;
import android.graphics.Bitmap;
public class WebViewClient {
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return false; }
    public boolean shouldOverrideUrlLoading(WebView view, String url) { return false; }
    public void onPageStarted(WebView view, String url, Bitmap favicon) {}
}
