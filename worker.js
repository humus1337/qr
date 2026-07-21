/* DesignYourQR runs on Cloudflare Workers static assets.
   The Worker runs before assets (run_worker_first) for one job: send the www
   host to the canonical apex with a 301, so links and search signals
   consolidate on https://designyourqr.com. Everything else is served straight
   from the static files in ./public. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.designyourqr.com') {
      url.hostname = 'designyourqr.com';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
