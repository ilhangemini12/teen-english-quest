import { readFile, writeFile, mkdir } from 'node:fs/promises';

const javaDir=new URL('../android/app/src/main/java/com/gua/spanish/',import.meta.url);
await mkdir(javaDir,{recursive:true});

const mainActivity=`package com.gua.spanish;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getBridge().getWebView().addJavascriptInterface(new GuaNativeBridge(), "GuaNative");
  }

  public class GuaNativeBridge {
    @JavascriptInterface
    public void playPlaylist(String json, int index, double rate) {
      runOnUiThread(() -> {
        Intent i=new Intent(MainActivity.this, GuaAudioService.class);
        i.setAction(GuaAudioService.ACTION_PLAY);
        i.putExtra("playlist", json);
        i.putExtra("index", index);
        i.putExtra("rate", (float)rate);
        startForegroundService(i);
      });
    }
    @JavascriptInterface
    public void pause() {
      Intent i=new Intent(MainActivity.this, GuaAudioService.class);
      i.setAction(GuaAudioService.ACTION_PAUSE); startService(i);
    }
    @JavascriptInterface
    public void resume() {
      Intent i=new Intent(MainActivity.this, GuaAudioService.class);
      i.setAction(GuaAudioService.ACTION_RESUME); startService(i);
    }
    @JavascriptInterface
    public void stop() {
      Intent i=new Intent(MainActivity.this, GuaAudioService.class);
      i.setAction(GuaAudioService.ACTION_STOP); startService(i);
    }
    @JavascriptInterface
    public void openExternal(String url) {
      try {
        Intent i=new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        startActivity(i);
      } catch(Exception ignored) {}
    }
  }
}
`;

const service=`package com.gua.spanish;

import android.app.*;
import android.content.*;
import android.media.AudioAttributes;
import android.media.session.MediaSession;
import android.os.*;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import androidx.annotation.Nullable;
import org.json.*;
import java.util.*;

public class GuaAudioService extends Service implements TextToSpeech.OnInitListener {
  public static final String ACTION_PLAY="gua.PLAY";
  public static final String ACTION_PAUSE="gua.PAUSE";
  public static final String ACTION_RESUME="gua.RESUME";
  public static final String ACTION_STOP="gua.STOP";
  public static final String ACTION_NEXT="gua.NEXT";
  public static final String ACTION_PREV="gua.PREV";

  private static final int NOTIFY_ID=2401;
  private static final String CHANNEL_ID="gua_audio";
  private TextToSpeech tts;
  private boolean ready=false, paused=false;
  private final ArrayList<JSONObject> playlist=new ArrayList<>();
  private int episodeIndex=0, segmentIndex=0;
  private float rate=1.0f;
  private String[] segments=new String[0];
  private MediaSession mediaSession;
  private final Handler handler=new Handler(Looper.getMainLooper());

  @Override public void onCreate(){
    super.onCreate();
    createChannel();
    mediaSession=new MediaSession(this,"GUA");
    mediaSession.setActive(true);
    tts=new TextToSpeech(this,this);
    tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
      @Override public void onStart(String id){}
      @Override public void onDone(String id){
        if(paused)return;
        segmentIndex++;
        if(segmentIndex>=segments.length){
          if(episodeIndex<playlist.size()-1){episodeIndex++;segmentIndex=0;loadSegments();updateNotification();speakCurrent();}
          else stopSelf();
        } else speakCurrent();
      }
      @Override public void onError(String id){ if(!paused) onDone(id); }
    });
  }

  @Override public int onStartCommand(Intent intent,int flags,int startId){
    if(intent==null)return START_STICKY;
    String action=intent.getAction();
    if(ACTION_PLAY.equals(action)){
      parsePlaylist(intent.getStringExtra("playlist"));
      episodeIndex=Math.max(0,Math.min(intent.getIntExtra("index",0),Math.max(0,playlist.size()-1)));
      rate=intent.getFloatExtra("rate",1.0f);
      segmentIndex=0;paused=false;loadSegments();
      startForeground(NOTIFY_ID,buildNotification(false));
      if(ready)speakCurrent();
    } else if(ACTION_PAUSE.equals(action)){
      paused=true;handler.removeCallbacksAndMessages(null);if(tts!=null)tts.stop();updateNotification();
    } else if(ACTION_RESUME.equals(action)){
      paused=false;updateNotification();if(ready)speakCurrent();
    } else if(ACTION_STOP.equals(action)){
      handler.removeCallbacksAndMessages(null);if(tts!=null)tts.stop();stopForeground(true);stopSelf();
    } else if(ACTION_NEXT.equals(action)){
      handler.removeCallbacksAndMessages(null);
      if(!playlist.isEmpty()){episodeIndex=(episodeIndex+1)%playlist.size();segmentIndex=0;paused=false;loadSegments();updateNotification();if(ready)speakCurrent();}
    } else if(ACTION_PREV.equals(action)){
      handler.removeCallbacksAndMessages(null);
      if(!playlist.isEmpty()){episodeIndex=(episodeIndex-1+playlist.size())%playlist.size();segmentIndex=0;paused=false;loadSegments();updateNotification();if(ready)speakCurrent();}
    }
    return START_STICKY;
  }

  private void parsePlaylist(String json){
    playlist.clear();
    try{JSONArray a=new JSONArray(json==null?"[]":json);for(int i=0;i<a.length();i++)playlist.add(a.getJSONObject(i));}catch(Exception ignored){}
  }

  private void loadSegments(){
    try{
      String text=playlist.get(episodeIndex).optString("text","");
      segments=Arrays.stream(text.split("(?<=[.!?])\\\\s+|\\\\n+")).map(String::trim).filter(x->!x.isEmpty()).toArray(String[]::new);
    }catch(Exception e){segments=new String[0];}
  }

  private void speakCurrent(){
    if(!ready||paused||segments.length==0||segmentIndex>=segments.length)return;
    try{
      String current=segments[segmentIndex].trim();
      if(current.equalsIgnoreCase("Pausa.")||current.equalsIgnoreCase("Pausa")){
        handler.postDelayed(() -> {
          if(!paused){
            segmentIndex++;
            if(segmentIndex>=segments.length){
              if(episodeIndex<playlist.size()-1){episodeIndex++;segmentIndex=0;loadSegments();updateNotification();speakCurrent();}
              else stopSelf();
            } else speakCurrent();
          }
        },4500);
        return;
      }
      tts.setSpeechRate(rate);
      Bundle b=new Bundle();
      b.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID,"gua_"+episodeIndex+"_"+segmentIndex);
      tts.speak(current,TextToSpeech.QUEUE_FLUSH,b,"gua_"+episodeIndex+"_"+segmentIndex);
    }catch(Exception ignored){}
  }

  private void chooseBestSpanishVoice(){
    try{
      Set<Voice> voices=tts.getVoices();
      if(voices==null||voices.isEmpty())return;
      Voice best=null;
      int bestScore=Integer.MIN_VALUE;
      for(Voice v:voices){
        Locale l=v.getLocale();
        if(l==null||!"es".equalsIgnoreCase(l.getLanguage()))continue;
        String country=l.getCountry()==null?"":l.getCountry();
        int localeScore="GT".equalsIgnoreCase(country)?500:"MX".equalsIgnoreCase(country)?450:"US".equalsIgnoreCase(country)?400:"ES".equalsIgnoreCase(country)?350:250;
        int score=localeScore+(v.getQuality()*10)+(v.getLatency()==Voice.LATENCY_LOW?20:0);
        if(score>bestScore){best=v;bestScore=score;}
      }
      if(best!=null)tts.setVoice(best);
    }catch(Exception ignored){}
  }

  @Override public void onInit(int status){
    if(status==TextToSpeech.SUCCESS){
      ready=true;
      int r=tts.setLanguage(new Locale("es","GT"));
      if(r==TextToSpeech.LANG_MISSING_DATA||r==TextToSpeech.LANG_NOT_SUPPORTED)tts.setLanguage(new Locale("es","MX"));
      chooseBestSpanishVoice();
      tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
      if(!paused)speakCurrent();
    }
  }

  private PendingIntent serviceAction(String action,int req){
    Intent i=new Intent(this,GuaAudioService.class);i.setAction(action);
    return PendingIntent.getService(this,req,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }

  private Notification buildNotification(boolean forcePaused){
    String title="GUA";
    try{if(!playlist.isEmpty())title=playlist.get(episodeIndex).optString("title","GUA");}catch(Exception ignored){}
    Intent open=new Intent(this,MainActivity.class);
    PendingIntent content=PendingIntent.getActivity(this,10,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    boolean isPaused=forcePaused||paused;
    Notification.Builder b=new Notification.Builder(this,CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(isPaused?"Duraklatıldı · GUA Gym Podcast":"İspanyolca pratik · GUA Gym Podcast")
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentIntent(content)
      .setOngoing(!isPaused)
      .setOnlyAlertOnce(true)
      .addAction(android.R.drawable.ic_media_previous,"Önceki",serviceAction(ACTION_PREV,1))
      .addAction(isPaused?android.R.drawable.ic_media_play:android.R.drawable.ic_media_pause,isPaused?"Devam":"Duraklat",serviceAction(isPaused?ACTION_RESUME:ACTION_PAUSE,2))
      .addAction(android.R.drawable.ic_media_next,"Sonraki",serviceAction(ACTION_NEXT,3))
      .setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0,1,2));
    return b.build();
  }

  private void updateNotification(){
    NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    nm.notify(NOTIFY_ID,buildNotification(paused));
  }

  private void createChannel(){
    if(Build.VERSION.SDK_INT>=26){
      NotificationChannel c=new NotificationChannel(CHANNEL_ID,"GUA background audio",NotificationManager.IMPORTANCE_LOW);
      c.setDescription("GUA Spanish podcast and shadowing playback");
      ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
    }
  }

  @Override public void onDestroy(){
    handler.removeCallbacksAndMessages(null);
    if(tts!=null){tts.stop();tts.shutdown();}
    if(mediaSession!=null){mediaSession.setActive(false);mediaSession.release();}
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent){return null;}
}
`;

await writeFile(new URL('MainActivity.java',javaDir),mainActivity);
await writeFile(new URL('GuaAudioService.java',javaDir),service);

const manifestUrl=new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url);
let manifest=await readFile(manifestUrl,'utf8');
if(!manifest.includes('FOREGROUND_SERVICE_MEDIA_PLAYBACK')){
  manifest=manifest.replace('<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
}
if(!manifest.includes('GuaAudioService')){
  manifest=manifest.replace('</application>','        <service android:name=".GuaAudioService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>');
}
await writeFile(manifestUrl,manifest);
console.log('GUA native Android background audio service installed.');
