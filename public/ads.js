/* Google AdSense integration.

   The AdSense library is loaded once from the <script> tag in the page <head>.
   That tag alone is enough for Auto ads: turn Auto ads on in the AdSense
   dashboard and Google places ads for you, no code changes needed.

   This file adds optional CURATED placements in fixed spots (the box under the
   preview and the strip below the FAQ), which look tidier than Auto ads. They
   stay hidden until you create display units in AdSense and paste their slot
   ids below, then redeploy.
*/
window.TITAN_ADS = { client: 'ca-pub-3769208320963674', slotSide: '', slotBottom: '' };

(function () {
  var cfg = window.TITAN_ADS;
  if (!cfg || !cfg.client) return;

  /* load the library only if the head tag is somehow missing, never twice */
  if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  [['ad-side', cfg.slotSide, 'rectangle'], ['ad-bottom', cfg.slotBottom, 'auto']].forEach(function (def) {
    var host = document.getElementById(def[0]);
    if (!host || !def[1]) return;
    host.hidden = false;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', cfg.client);
    ins.setAttribute('data-ad-slot', def[1]);
    ins.setAttribute('data-ad-format', def[2]);
    ins.setAttribute('data-full-width-responsive', 'true');
    host.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
