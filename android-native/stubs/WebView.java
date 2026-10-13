package android.webkit;
import android.content.Context;
import android.graphics.Paint;
import android.view.View;
public class WebView extends View {
    public WebView(Context context) { super(context); }
    public WebSettings getSettings() { return null; }
    public void setBackgroundColor(int color) {}
    public void setLayerType(int layerType, Paint paint) {}
    public void addJavascriptInterface(Object object, String name) {}
    public void evaluateJavascript(String script, ValueCallback<String> resultCallback) {}
    public void setWebViewClient(WebViewClient client) {}
    public void loadUrl(String url) {}
}
