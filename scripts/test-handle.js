const https = require('https');
const handle = process.argv[2] || 'dbongino';
const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
https.get(url, {headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}}, res => {
  let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
    const m=d.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if(m === null){console.log(handle + ': No data found (account may not exist)');return;}
    const j=JSON.parse(m[1]);
    const hasResults=j.props?.pageProps?.contextProvider?.hasResults;
    const entries=j.props?.pageProps?.timeline?.entries||[];
    const tweetEntries = entries.filter(e => e.type === 'tweet' && e.content?.tweet?.user?.screen_name?.toLowerCase() === handle.toLowerCase());
    console.log(handle + ': hasResults=' + hasResults + ', total_entries=' + entries.length + ', own_tweets=' + tweetEntries.length);
    if(tweetEntries.length > 0) {
      const t = tweetEntries[0].content.tweet;
      console.log('  Name:', t.user?.name);
      console.log('  Latest:', (t.full_text||t.text||'').substring(0,100));
      console.log('  Date:', t.created_at);
    }
  });
});
