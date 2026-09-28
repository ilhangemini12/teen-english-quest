#!/usr/bin/env python3
import json,re,hashlib,html,time
from datetime import datetime,timezone,timedelta
from pathlib import Path
import feedparser
from bs4 import BeautifulSoup

# "Fresh English Today" mixes current-interest material with a small American-English
# evergreen layer. All cards point to the original publisher.
FEEDS=[
("Science News Explores","Science & Tech","https://www.snexplores.org/feed/","🧪",10),
("TED Talks Daily","Podcast","https://feeds.feedburner.com/TEDTalks_audio","🎧",9),
("BBC 6 Minute English","British English","https://podcasts.files.bbci.co.uk/p02pc9tn.rss","🇬🇧",10),
("BBC Learning English Conversations","British English","https://podcasts.files.bbci.co.uk/p02pc9zn.rss","💬",9),
("BBC Learning English Vocabulary","British English","https://podcasts.files.bbci.co.uk/p02pc9xz.rss","🧠",9),
("Teen Vogue","Style & Trends","https://www.teenvogue.com/feed/rss","✨",10),
("Smithsonian Science","Science & Tech","https://www.smithsonianmag.com/rss/science-nature/","🔭",8),
("Smithsonian Innovation","Science & Tech","https://www.smithsonianmag.com/rss/innovation/","💡",8),
("Smithsonian Arts & Culture","Culture","https://www.smithsonianmag.com/rss/arts-culture/","🎨",8),
("NASA JPL News","Science & Tech","https://www.jpl.nasa.gov/feeds/news/","🚀",8),
("NASA JPL Podcasts","Podcast","https://www.jpl.nasa.gov/feeds/podcasts/","🛰️",7),
("NASA Photojournal","Science & Tech","https://science.nasa.gov/feed/photojournal/latest-content/","🌌",7),
("VOA Arts & Culture","Culture","https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym","🎬",6),
("VOA Science & Technology","Science & Tech","https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm","🔬",6),
("VOA Words & Their Stories","American English","https://learningenglish.voanews.com/api/zmypyl-vomx-tpeyry_","💬",8),
("VOA Everyday Grammar","American English","https://learningenglish.voanews.com/api/zoroqql-vomx-tpeptpqq","✍️",8),
("VOA English in a Minute","American English","https://learningenglish.voanews.com/api/zjk-rl-vomx-tpebpqqo","⚡",8),
("VOA News Words","American English","https://learningenglish.voanews.com/api/z-k-ql-vomx-tpermqqi","🗞️",6),
("VOA How to Pronounce","American English","https://learningenglish.voanews.com/api/zpivqol-vomx-tpe_guqi","🗣️",9),
("VOA Learning English Podcast","Podcast","https://learningenglish.voanews.com/api/ziiy_l-vomx-tpemgtv","🎧",6),
("VOA What's Trending","Culture","https://learningenglish.voanews.com/api/z_goqvl-vomx-tpevmmqt","✨",5),
("VOA Level 2","American English","https://learningenglish.voanews.com/api/zt-pq_l-vomx-tpekyyqv","🇺🇸",7)
]

# Exclude material likely to feel too adult, distress-heavy, political, or otherwise
# unsuitable for a general 14-year-old learning feed. The filter is deliberately
# conservative because original-source pages can change over time.
BLOCK={
"suicide","self-harm","self harm","murder","shooting","gun ","guns ","weapon","bomb","bombing",
"sexual"," sex ","porn","alcohol","vape","vaping","cigarette","marijuana","cannabis","cocaine",
"heroin","opioid","gambling","betting","casino","election","campaign","president","congress",
"senate","abortion","refugee","displaced","war ","warfare","terror","hostage","assault",
"abuse","overdose","execution","executed","killed","kill ","violent","violence","trauma"
}
TED_PREFER={
"science","technology","future","learn","learning","school","student","teen","brain","space","music",
"creative","creativity","language","communication","confidence","design","art","environment","climate",
"animal","ocean","culture","story","book","curiosity","idea","memory","focus","education","game","fun",
"productivity","nature","robot","ai ","artificial intelligence","career","friend","habit"
}
TEEN_VOGUE_PREFER={
"fashion","style","beauty","makeup","hair","nail","perfume","music","movie","film","tv ","television",
"book","gaming","game","celebrity","designer","outfit","trend","shopping","culture"
}
YOUTH_BOOST={
"teen":5,"student":4,"school":4,"game":4,"music":3,"movie":3,"film":3,"book":3,"space":4,"robot":4,
"ai ":4,"artificial intelligence":4,"animal":3,"ocean":3,"dinosaur":3,"fossil":3,"photo":2,"art ":2,
"design":3,"creative":3,"language":3,"english":4,"grammar":4,"pronounce":5,"story":3,"memory":3,
"focus":3,"study":4,"learn":3,"technology":3,"science":3,"mars":4,"moon":3,"planet":3,"fun":3
}

def textify(raw):
    if not raw:return ""
    soup=BeautifulSoup(raw,"html.parser")
    return re.sub(r"\s+"," ",html.unescape(" ".join(soup.stripped_strings))).strip()

def blocked(txt):
    t=" "+txt.lower()+" "
    return any(x in t for x in BLOCK)

def iso(e):
    st=e.get("published_parsed") or e.get("updated_parsed")
    return datetime.fromtimestamp(time.mktime(st),timezone.utc).isoformat() if st else None

def key(src,title,url):
    return hashlib.sha1((src+"|"+title+"|"+url).encode()).hexdigest()[:14]

def score_item(src,cat,title,summary,published,priority):
    txt=(title+" "+summary).lower()
    score=priority
    for k,v in YOUTH_BOOST.items():
        if k in txt: score+=v
    if cat=="American English": score+=5
    if published:
        try:
            d=datetime.fromisoformat(published.replace("Z","+00:00"))
            age=(datetime.now(timezone.utc)-d).days
            if age<=2: score+=12
            elif age<=7: score+=9
            elif age<=30: score+=6
            elif age<=120: score+=3
            elif age>500: score-=6
        except: pass
    return score

raw=[]
for src,cat,url,emoji,priority in FEEDS:
    try:
        f=feedparser.parse(url)
        accepted=0
        for e in f.entries[:30]:
            title=textify(e.get("title","")); link=e.get("link","")
            summary=textify(e.get("summary") or e.get("description") or "")
            combined=title+" "+summary
            if not title or not link or blocked(combined): continue
            if src=="TED Talks Daily" and not any(k in combined.lower() for k in TED_PREFER): continue
            if src.startswith("Smithsonian") and not any(k in combined.lower() for k in YOUTH_BOOST): continue
            if src=="Teen Vogue" and not any(k in combined.lower() for k in TEEN_VOGUE_PREFER): continue
            if len(summary)>210: summary=summary[:207].rsplit(" ",1)[0]+"…"
            published=iso(e)
            image=""
            try:
                if e.get("media_thumbnail"): image=e["media_thumbnail"][0].get("url","")
                elif e.get("media_content"): image=e["media_content"][0].get("url","")
                else:
                    raw_html=e.get("summary") or e.get("description") or ""
                    m=re.search(r'<img[^>]+src=["\']([^"\']+)',raw_html,re.I)
                    if m:image=html.unescape(m.group(1))
            except Exception: pass
            raw.append({
                "key":key(src,title,link),"source":src,"category":cat,"emoji":emoji,
                "title":title,"summary":summary,"url":link,"published":published,"image":image,
                "_score":score_item(src,cat,title,summary,published,priority)
            })
            accepted+=1
            if accepted>=12: break
    except Exception as ex:
        print("feed failed",src,ex)

# Deduplicate both URLs and repetitive episode titles (notably some podcast feeds).
dedup={}
title_seen=set()
for x in sorted(raw,key=lambda x:x["_score"],reverse=True):
    title_key=(x["source"].lower(),re.sub(r"\W+"," ",x["title"].lower()).strip())
    if x["key"] in dedup or title_key in title_seen: continue
    dedup[x["key"]]=x
    title_seen.add(title_key)

items=list(dedup.values())

# Build a balanced shelf: recent/interesting first, source caps, and enough
# American-English practice in every refresh.
items.sort(key=lambda x:(x["_score"],x["published"] or ""),reverse=True)
source_counts={}; cat_counts={}; out=[]

# Guarantee a useful minimum from American English if available.
for x in items:
    if x["category"]!="American English": continue
    if source_counts.get(x["source"],0)>=3: continue
    out.append(x); source_counts[x["source"]]=source_counts.get(x["source"],0)+1
    cat_counts[x["category"]]=cat_counts.get(x["category"],0)+1
    if cat_counts["American English"]>=10: break

for x in items:
    if x in out: continue
    if source_counts.get(x["source"],0)>=5: continue
    category_caps={"Science & Tech":14,"American English":12,"British English":10,"Podcast":8,"Culture":8,"Style & Trends":10}
    if cat_counts.get(x["category"],0)>=category_caps.get(x["category"],10): continue
    out.append(x)
    source_counts[x["source"]]=source_counts.get(x["source"],0)+1
    cat_counts[x["category"]]=cat_counts.get(x["category"],0)+1
    if len(out)>=54: break

# Final display order favors freshness while retaining category variety.
def sort_key(x):
    try: d=datetime.fromisoformat((x["published"] or "").replace("Z","+00:00")).timestamp()
    except: d=0
    return (d,x["_score"])
out.sort(key=sort_key,reverse=True)
for x in out: x.pop("_score",None)

Path("feed.json").write_text(json.dumps({
    "updated_at":datetime.now(timezone.utc).isoformat(),
    "items":out
},ensure_ascii=False,indent=2),encoding="utf-8")
print("wrote",len(out),"items",cat_counts)
