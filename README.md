# Lantern

Lantern is a Chrome extension that finds ideas on ordinary webpages. Describe a concept in plain English and Lantern ranks visible passages with TypeSafe AI's Jev model, highlights the best matches, and lets you move between them.

## Architecture

The extension never contains a TypeSafe API key. It sends only the query and extracted visible passages to the paired backend. The private-alpha Cloudflare Worker in `worker/` reads `TYPESAFE_API_KEY` only from encrypted secret storage and calls `POST https://api.typesafe.ai/v1/systemone` with pinned `jev-1.13.0`. Pair each installed extension from its Options page with the Worker URL and a random install token.

Data sent per search: the user's query, page URL/title, and extracted visible text passages. Nothing is sent until the user presses Search.

## Local setup

1. Use Node 20 or newer.
2. Copy `.env.example` to `.env` and set `TYPESAFE_API_KEY`.
3. For local proxy development, run `set -a; . ./.env; set +a; npm start`. For private alpha, deploy `worker/` and enter required values only as encrypted Worker secrets.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`.
5. Open Lantern settings, enter the HTTPS Worker URL and install token, then open an ordinary `http` or `https` webpage and click Lantern.

The Worker requires an exact `ALLOWED_ORIGINS` extension origin. The manifest public key keeps Lantern's extension ID stable across unpacked installations. Do not put the install token or TypeSafe key in the source tree or ZIP.

## Tests

Run `npm test`. The tests cover passage normalization, ranking, and match selection without making network requests.

## Security notes

- Never put a TypeSafe key in extension code, browser storage, commits, screenshots, or logs.
- The proxy does not log request bodies or credentials.
- Production use needs authentication, rate limiting, HTTPS, an exact `ALLOWED_ORIGIN`, request-size controls, and secret storage supplied by the hosting platform.
- Restricted Chrome pages, the Chrome Web Store, browser internals, and some cross-origin embedded frames cannot be searched.

## Current status

This first version is an unpacked Manifest V3 extension with a local Node proxy. No paid infrastructure is required or deployed.
