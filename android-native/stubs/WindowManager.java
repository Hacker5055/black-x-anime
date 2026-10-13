package android.view;
public interface WindowManager {
    public static class LayoutParams extends ViewGroup.LayoutParams {
        public float preferredRefreshRate;
        public int preferredDisplayModeId;
        public int layoutInDisplayCutoutMode;
        public LayoutParams() { super(-1, -1); }
    }
    Display getDefaultDisplay();
}
