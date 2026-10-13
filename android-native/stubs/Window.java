package android.view;
public class Window {
    public boolean requestFeature(int featureId) { return false; }
    public void setLayout(int w, int h) {}
    public void setStatusBarColor(int color) {}
    public void setNavigationBarColor(int color) {}
    public void addFlags(int flags) {}
    public void clearFlags(int flags) {}
    public View getDecorView() { return null; }
    public WindowManager.LayoutParams getAttributes() { return null; }
    public void setAttributes(WindowManager.LayoutParams a) {}
}
