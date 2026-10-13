package android.view;
import android.content.Context;
public class ViewGroup extends View {
    public ViewGroup(Context c) { super(c); }
    public static class LayoutParams {
        public static final int MATCH_PARENT = -1;
        public static final int WRAP_CONTENT = -2;
        public LayoutParams(int w, int h) {}
    }
}
