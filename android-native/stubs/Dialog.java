package android.app;
import android.content.Context;
import android.content.DialogInterface;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
public class Dialog implements DialogInterface {
    public Dialog(Context context, int themeResId) {}
    public Window getWindow() { return null; }
    public void setCancelable(boolean flag) {}
    public void setOnCancelListener(DialogInterface.OnCancelListener l) {}
    public void setContentView(View view, ViewGroup.LayoutParams params) {}
    public void show() {}
    public void dismiss() {}
}
