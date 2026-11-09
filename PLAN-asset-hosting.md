# Plan: hosting the source art and media ourselves

Written 9 November 2026, at the owner's ask, after the backups were renamed and the first
research. Nothing here is built. CLAUDE.md ("Where the pictures and media live") has the
backups, the sizes and why the assets are not in the repo; this is the way out of depending on
other people's hosts.

## Goal

Today the pages load ~1.4 GB of art, voice lines, animations and signatures from four hosts
nobody here controls (`raw.githubusercontent.com`'s Arknight-Images mirror, `wsrv.nl`'s source
URLs, `cdn.holodori.dev`, hololive Dreams' image host). The backups keep copies, but no page
serves them. Goal: the pages load from a host we control, with the old hosts as the fallback.

## Does it work from github.io? Yes

- A page on `seangcs27.github.io` may load an image, audio or video from any https origin. It
  already does, from the four hosts above. The site sets no Content-Security-Policy, so nothing
  blocks a new one.
- CORS is needed only for `fetch()` or a canvas that reads pixels back. Neither is done with
  these assets today (the reveal draws a video onto a canvas and never reads it back, and the
  waveform is a shape made from a name). R2 can send CORS headers anyway (a policy per bucket,
  `AllowedOrigins: https://seangcs27.github.io`).
- Range requests (seeking in a video or voice line) are standard on object storage. **Not
  tested**: it has to be tried on whichever host is picked, before the pages are switched.

## The hosts, as researched on 9 November 2026

| Host | Free | Needs | Catches |
|---|---|---|---|
| **Cloudflare R2, custom domain** | 10 GB storage, 1M writes and 10M reads a month, egress free | A Cloudflare account, **a domain on Cloudflare (about $10 a year)**, a payment method (see below) | Production path per Cloudflare's docs; caching and CORS work |
| **Cloudflare R2, `r2.dev` address** | Same | The account; no domain | Cloudflare calls it "not intended for production": rate limited (hundreds of requests a second, then 429s), no caching |
| **Cloudflare Pages (`pages.dev`)** | Free plan; 20,000 files a site, 25 MiB a file, 100 projects an account | The account; no domain | No total site size or bandwidth is stated on its limits page. Its docs send larger files to R2. Cloudflare's terms limit serving mostly non-HTML content on the CDN; whether that reaches Pages is **unclear** (sources conflict) |
| **Backblaze B2** | 10 GB, egress free up to 3x what is stored | An account | Whether it needs a card, and its public-bucket and CORS setup, are **not confirmed** |
| **GitHub release assets, file by file** | No stated limit on size or bandwidth; 2 GiB a file; 1,000 assets a release | Nothing new | About 6,500 files, so several releases; a release is for software, so the abuse rules are the risk; hotlinking **not tested** |
| **More GitHub Pages sites** | 1 GB each | Nothing new | A grey area against GitHub's limits; set aside |

Whether R2 needs a card on file is **disputed**: Cloudflare's product page says no card, and
users and dashboard guides say one is needed to turn it on. The only sure test is the sign-up
screen.

## Choosing

1. **R2 with a custom domain** is the clean answer if you will put a card on file (nothing is
   charged within the free tier; set a billing alert) and buy a domain.
2. **Cloudflare Pages** is the answer if you want no card and no domain, accepting the
   terms question.
3. Otherwise **stay with the backups** (today's state).

## What the public repo changes: nothing, if the token stays off GitHub

The repo is public, so no secret goes in it, and none needs to. The backups are already run by
hand from your machine; the upload to a bucket would be too. The API token lives in your own
keyring or environment, scoped to the one bucket (Object Read & Write), and CI never sees it.
The bucket is public-read, which is what a CDN is. CI keeps using only `GITHUB_TOKEN`.

## Phases

**0. Decide** the host above, and make the account. Nothing else starts before this.

**1. Upload.** Extend `scripts/lib/release-backup.mjs`, or a sibling, to push the files in
`backup/source-art/` and `backup/holodori-media/` to the bucket, key for key, by the S3 API
(R2 speaks it). It uploads only what the bucket lacks, as the backups fetch only what they
lack. The tars on the releases stay as the second copy.
Keys: `source-art/ark/…`, `source-art/ptn/…`, `source-art/holodori/…`, `media/…`: the paths the
backup scripts already use inside their tars.

**2. Test the host** on a few files, from `seangcs27.github.io` in a browser: an image, a voice
line, an animation seeking back and forth, the signature on its canvas, headers and caching.

**3. Switch the pages, with the old host as the fallback.**
- *Art:* `artUrl()` in `src/shared/api/hella-api.ts` asks `wsrv.nl` to resize a source URL.
  Keep `wsrv.nl` as the resizer and change the source URL to the bucket's: our copies are the
  2048px originals, and `wsrv.nl` cuts the 128px and 1024px sizes from them as it does now. An
  image that fails is asked once of the old source, as `bindImageMirror` does for the GitHub
  mirror.
- *Media:* `holodori-cdn.ts` (`voiceUrl`, the card art, animation and signature addresses) takes
  the bucket's base address, and falls back to `cdn.holodori.dev`.
- *Keys* are made from the same rule the backup scripts use, so no manifest ships in the
  bundle (a list of ~6,500 keys would cost the pages' JavaScript budgets).
- *Budgets* in `scripts/site-check.mjs` may need a line if a view's JavaScript grows.

**4. Watch** for broken images and stalled audio for a few days (the old hosts are still the
fallback), then decide whether to stop depending on them.

## Costs and limits

- 1.5 GB is a seventh of R2's free storage. Reads: each card page is on the order of tens of
  requests, against 10 million free a month.
- A domain is the only certain cost, about $10 a year.
- The 6-hourly deploy is unaffected: the bucket is not part of the build.

## Open questions for the owner

- Which host, and is a card on file acceptable?
- A domain: which, and on which registrar (Cloudflare's, at cost)?
- Does the 2048px art viewer need the originals' full quality, or would 1536px do (about 580
  MB instead of about 960 MB; measured on 16 images)? On R2 it does not matter.
