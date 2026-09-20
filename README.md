# Lantern

Lantern is a Chrome extension that finds ideas on ordinary webpages. Describe a concept in plain English and Lantern ranks visible passages with TypeSafe AI's Jev model, highlights the best matches, and lets you move between them.

## Architecture

The extension never contains a TypeSafe API key. It sends only the query and extracted visible passages to the local proxy in `server/`. The proxy reads `TYPESAFE_API_KEY` from its environment and calls `POST https://api.typesafe.ai/v1/systemone` with `jev-latest`. For a distributed build, deploy the same proxy behind authentication and rate limits, then change `LANTERN_API_URL` in `extension/background.js`.

Data sent per search: the user's query, page URL/title, and extracted visible text passages. Nothing is sent until the user presses Search.

## Local setup

1. Use Node 20 or newer.
2. Copy `.env.example` to `.env` and set `TYPESAFE_API_KEY`.
3. Run `set -a; . ./.env; set +a; npm start`.
4. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`.
5. Open an ordinary `http` or `https` webpage and click Lantern.

During local development, leave `ALLOWED_ORIGIN` unset to allow Chrome extension origins. Set it to the exact extension origin in any shared environment.

## Tests

Run `npm test`. The tests cover passage normalization, ranking, and match selection without making network requests.

## Security notes

- Never put a TypeSafe key in extension code, browser storage, commits, screenshots, or logs.
- The proxy does not log request bodies or credentials.
- Production use needs authentication, rate limiting, HTTPS, an exact `ALLOWED_ORIGIN`, request-size controls, and secret storage supplied by the hosting platform.
- Restricted Chrome pages, the Chrome Web Store, browser internals, and some cross-origin embedded frames cannot be searched.

## Current status

This first version is an unpacked Manifest V3 extension with a local Node proxy. No paid infrastructure is required or deployed.
