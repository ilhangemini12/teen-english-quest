package com.gua.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import java.util.ArrayList;
import java.util.List;

public class AudioPlayerService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.gua.app.PLAY";
    public static final String ACTION_STOP = "com.gua.app.STOP";
    public static final String ACTION_TOGGLE = "com.gua.app.TOGGLE";
    public static final String ACTION_NEXT = "com.gua.app.NEXT";
    public static final String ACTION_PREVIOUS = "com.gua.app.PREVIOUS";
    public static final String ACTION_SPEED = "com.gua.app.SPEED";
    public static final String ACTION_STATE = "com.gua.app.PLAYER_STATE";
    public static final String EXTRA_URLS = "urls";
    public static final String EXTRA_CAPTIONS = "captions";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_SPEED = "speed";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private ArrayList<String> captions = new ArrayList<>();
    private String currentTitle = "GUA";
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            emitState();
            handler.postDelayed(this, 180);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        player.addListener(new Player.Listener() {
            @Override public void onIsPlayingChanged(boolean isPlaying) { emitState(); }
            @Override public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) { emitState(); }
            @Override public void onPlaybackStateChanged(int playbackState) { emitState(); }
        });
        mediaSession = new MediaSession.Builder(this, player).build();
        handler.post(ticker);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return super.onStartCommand(intent, flags, startId);
        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            player.stop();
            player.clearMediaItems();
            captions.clear();
            emitState();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_TOGGLE.equals(action)) {
            if (player.isPlaying()) player.pause(); else player.play();
            emitState();
            return START_STICKY;
        }

        if (ACTION_NEXT.equals(action)) {
            if (player.hasNextMediaItem()) player.seekToNextMediaItem();
            emitState();
            return START_STICKY;
        }

        if (ACTION_PREVIOUS.equals(action)) {
            if (player.hasPreviousMediaItem()) player.seekToPreviousMediaItem();
            else player.seekTo(0);
            emitState();
            return START_STICKY;
        }

        if (ACTION_SPEED.equals(action)) {
            float speed = Math.max(0.5f, Math.min(2.0f, intent.getFloatExtra(EXTRA_SPEED, 1f)));
            player.setPlaybackSpeed(speed);
            emitState();
            return START_STICKY;
        }

        if (ACTION_PLAY.equals(action)) {
            ArrayList<String> urls = intent.getStringArrayListExtra(EXTRA_URLS);
            ArrayList<String> cap = intent.getStringArrayListExtra(EXTRA_CAPTIONS);
            currentTitle = intent.getStringExtra(EXTRA_TITLE);
            if (currentTitle == null || currentTitle.isBlank()) currentTitle = "GUA Audio";
            captions = cap == null ? new ArrayList<>() : cap;

            if (urls != null && !urls.isEmpty()) {
                List<MediaItem> items = new ArrayList<>();
                for (int i = 0; i < urls.size(); i++) {
                    String itemCaption = i < captions.size() ? captions.get(i) : "";
                    MediaMetadata metadata = new MediaMetadata.Builder()
                            .setTitle(itemCaption == null || itemCaption.isBlank() ? currentTitle : itemCaption)
                            .setArtist(currentTitle)
                            .build();
                    items.add(new MediaItem.Builder()
                            .setUri(Uri.parse(urls.get(i)))
                            .setMediaMetadata(metadata)
                            .build());
                }
                player.setMediaItems(items);
                player.setPlaybackSpeed(1f);
                player.prepare();
                player.play();
                emitState();
            }
        }
        return super.onStartCommand(intent, flags, startId);
    }

    private void emitState() {
        if (player == null) return;
        int index = player.getCurrentMediaItemIndex();
        long duration = player.getDuration();
        long position = player.getCurrentPosition();
        if (duration == C.TIME_UNSET || duration < 0) duration = 0;
        if (position < 0) position = 0;

        String caption = index >= 0 && index < captions.size() ? captions.get(index) : "";
        int wordIndex = -1;
        if (caption != null && !caption.isBlank() && duration > 0) {
            String[] words = caption.trim().split("\\s+");
            if (words.length > 0) {
                double fraction = Math.max(0d, Math.min(0.999d, (double) position / (double) duration));
                wordIndex = Math.min(words.length - 1, (int) Math.floor(fraction * words.length));
            }
        }

        Intent state = new Intent(ACTION_STATE);
        state.setPackage(getPackageName());
        state.putExtra("title", currentTitle);
        state.putExtra("caption", caption == null ? "" : caption);
        state.putExtra("wordIndex", wordIndex);
        state.putExtra("index", Math.max(0, index));
        state.putExtra("count", player.getMediaItemCount());
        state.putExtra("position", position);
        state.putExtra("duration", duration);
        state.putExtra("playing", player.isPlaying());
        state.putExtra("speed", player.getPlaybackParameters().speed);
        sendBroadcast(state);
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        mediaSession = null;
        player = null;
        super.onDestroy();
    }
}
