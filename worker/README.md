# Lantern Worker

Cloudflare Worker adapter for Lantern's private alpha. Never put secret values in this directory or Wrangler config.

Required encrypted secrets: `TYPESAFE_API_KEY`, `INSTALL_TOKEN`, and `ALLOWED_ORIGINS`. Keep `KILL_SWITCH=true` available as an emergency stop. The rate limiter is a first layer; the install bearer token is the authentication boundary.
