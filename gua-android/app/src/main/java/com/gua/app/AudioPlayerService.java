package com.gua.app;

import android.content.Intent;
import android.net.Uri;

import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import java.util.ArrayList;
import java.util.List;

public class AudioPlayerService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.gua.app.PLAY";
    public static final String ACTION_STOP = "com.gua.app.STOP";
    public static final String EXTRA_URLS = "urls";
    public static final String EXTRA_TITLE = "title";

    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            player.stop();
            player.clearMediaItems();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null && ACTION_PLAY.equals(intent.getAction())) {
            ArrayList<String> urls = intent.getStringArrayListExtra(EXTRA_URLS);
            String title = intent.getStringExtra(EXTRA_TITLE);
            if (urls != null && !urls.isEmpty()) {
                List<MediaItem> items = new ArrayList<>();
                for (int i = 0; i < urls.size(); i++) {
                    MediaMetadata metadata = new MediaMetadata.Builder()
                            .setTitle(title == null ? "GUA Audio" : title)
                            .setArtist(i == 0 ? "GUA" : "GUA · " + (i + 1))
                            .build();
                    items.add(new MediaItem.Builder()
                            .setUri(Uri.parse(urls.get(i)))
                            .setMediaMetadata(metadata)
                            .build());
                }
                player.setMediaItems(items);
                player.prepare();
                player.play();
            }
        }
        return super.onStartCommand(intent, flags, startId);
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        mediaSession = null;
        player = null;
        super.onDestroy();
    }
}
