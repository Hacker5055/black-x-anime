package android.view;
public class Display {
    public static class Mode {
        public int getModeId() { return 0; }
        public int getPhysicalWidth() { return 0; }
        public int getPhysicalHeight() { return 0; }
        public float getRefreshRate() { return 0f; }
    }
    public Mode getMode() { return null; }
    public Mode[] getSupportedModes() { return null; }
}
