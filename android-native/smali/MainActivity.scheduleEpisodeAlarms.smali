# Inserted into app/blackx/mobile/MainActivity.smali by tools/apk/native_patch.py (APK v18.0).
# JS: BlackXNativeAuth.scheduleEpisodeAlarms(json) -> how many alarms were armed, -1 on failure.
# Everything happens in EpisodeAlarms; any error stays inside this method.
.method public scheduleEpisodeAlarms(Ljava/lang/String;)I
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    invoke-virtual {p0}, Lapp/blackx/mobile/MainActivity;->getApplicationContext()Landroid/content/Context;

    move-result-object v0

    invoke-static {v0, p1}, Lapp/blackx/mobile/EpisodeAlarms;->schedule(Landroid/content/Context;Ljava/lang/String;)I

    move-result v0
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    return v0

    :catch_0
    move-exception v0

    const/4 v0, -0x1

    return v0
.end method
