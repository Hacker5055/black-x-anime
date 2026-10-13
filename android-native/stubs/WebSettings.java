package android.webkit;
public abstract class WebSettings {
    public abstract void setJavaScriptEnabled(boolean flag);
    public abstract void setDomStorageEnabled(boolean flag);
    public abstract void setDatabaseEnabled(boolean flag);
    public abstract void setMediaPlaybackRequiresUserGesture(boolean flag);
    public abstract void setJavaScriptCanOpenWindowsAutomatically(boolean flag);
    public abstract void setMixedContentMode(int mode);
    public abstract void setOffscreenPreRaster(boolean flag);
    public abstract String getUserAgentString();
    public abstract void setUserAgentString(String ua);
}
