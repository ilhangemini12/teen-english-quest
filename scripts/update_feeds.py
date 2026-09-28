#!/usr/bin/env python3
import json,re,hashlib,html,time
from datetime import datetime,timezone
from pathlib import Path
import feedparser
from bs4 import BeautifulSoup

FEEDS=[
("VOA Arts & Culture","Culture","https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym","🎬"),
("VOA Science & Technology","Science & Tech","https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm","🔬"),
("VOA Words & Their Stories","American English","https://learningenglish.voanews.com/api/zmypyl-vomx-tpeyry_","💬"),
("VOA Everyday Grammar","American English","https://learningenglish.voanews.com/api/zoroqql-vomx-tpeptpqq","✍️"),
("VOA English in a Minute","American English","https://learningenglish.voanews.com/api/zjk-rl-vomx-tpebpqqo","⚡"),
("VOA News Words","American English","https://learningenglish.voanews.com/api/z-k-ql-vomx-tpermqqi","🗞️"),
("VOA How to Pronounce","American English","https://learningenglish.voanews.com/api/zpivqol-vomx-tpe_guqi","🗣️"),
("VOA Learning English Podcast","Podcast","https://learningenglish.voanews.com/api/ziiy_l-vomx-tpemgtv","🎧"),
("VOA What's Trending","Culture","https://learningenglish.voanews.com/api/z_goqvl-vomx-tpevmmqt","✨"),
("VOA Level 2","American English","https://learningenglish.voanews.com/api/zt-pq_l-vomx-tpekyyqv","🇺🇸"),
("TED Talks Daily","Podcast","https://feeds.feedburner.com/TEDTalks_audio","🎧"),
("NASA JPL News","Science & Tech","https://www.jpl.nasa.gov/feeds/news/","🚀"),
("NASA JPL Podcasts","Podcast","https://www.jpl.nasa.gov/feeds/podcasts/","🛰️"),
("NASA Photojournal","Science & Tech","https://science.nasa.gov/feed/photojournal/latest-content/","🌌"),
("Science News Explores","Science & Tech","https://www.snexplores.org/feed/","🧪")
]
BLOCK={"suicide","self-harm","self harm","killed","murder","shooting","gun","weapon","bomb","bombing","war ","sexual","sex ","porn","alcohol","vape","vaping","cigarette","marijuana","cannabis","cocaine","heroin","opioid","gambling","betting","casino","election","campaign","president","congress","senate","abortion"}
TED_PREFER={"science","technology","future","learn","learning","school","student","teen","brain","space","music","creative","creativity","language","communication","confidence","design","artificial intelligence","environment","climate","animal","ocean","culture","story","book","curiosity","idea","memory","focus","education"}

def textify(raw):
    if not raw:return ""
    soup=BeautifulSoup(raw,"html.parser")
    return re.sub(r"\s+"," ",html.unescape(" ".join(soup.stripped_strings))).strip()
def bad(txt):
    t=" "+txt.lower()+" "
    return any(x in t for x in BLOCK)
def iso(e):
    st=e.get("published_parsed") or e.get("updated_parsed")
    return datetime.fromtimestamp(time.mktime(st),timezone.utc).isoformat() if st else None
def key(src,title,url):
    return hashlib.sha1((src+"|"+title+"|"+url).encode()).hexdigest()[:14]

items=[]
for src,cat,url,emoji in FEEDS:
    try:
        f=feedparser.parse(url);count=0
        for e in f.entries[:20]:
            title=textify(e.get("title",""));link=e.get("link","");summary=textify(e.get("summary") or e.get("description") or "")
            combined=title+" "+summary
            if not title or not link or bad(combined):continue
            if src=="TED Talks Daily" and not any(k in combined.lower() for k in TED_PREFER):continue
            if len(summary)>220:summary=summary[:217].rsplit(" ",1)[0]+"…"
            items.append({"key":key(src,title,link),"source":src,"category":cat,"emoji":emoji,"title":title,"summary":summary,"url":link,"published":iso(e)})
            count+=1
            if count>=7:break
    except Exception as ex:print("feed failed",src,ex)
dedup={}
for x in items:dedup.setdefault(x["key"],x)
items=list(dedup.values())
items.sort(key=lambda x:(x["published"] is not None,x["published"] or ""),reverse=True)
counts={};out=[]
for x in items:
    if counts.get(x["source"],0)>=6:continue
    counts[x["source"]]=counts.get(x["source"],0)+1;out.append(x)
    if len(out)>=42:break
Path("feed.json").write_text(json.dumps({"updated_at":datetime.now(timezone.utc).isoformat(),"items":out},ensure_ascii=False,indent=2),encoding="utf-8")
print("wrote",len(out),"items")
