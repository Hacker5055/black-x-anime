package android.webkit;
public abstract class CookieManager {
    public static CookieManager getInstance() { return null; }
    public abstract void setAcceptCookie(boolean accept);
    public abstract void setAcceptThirdPartyCookies(WebView webview, boolean accept);
}
