# Lienks tracker

This is the script that [Lienks](https://lienks.com) loads on your website. It is open source so you can see exactly what it does before you add it to your site.

- About 1.4 KB gzipped
- No dependencies
- No cookies by default

`tracker.js` in this repo is the unminified build of the tracker. The file served at `https://app.lienks.com/a.js` is the same build, minified.

## Install

Add this to the `<head>` of every page. You find your site ID in the Lienks dashboard.

```html
<script defer src="https://app.lienks.com/a.js" data-site="YOUR-SITE-ID"></script>
```

The script sends its data to `/api/events` on the host it was loaded from, so with the snippet above that is `https://app.lienks.com/api/events`.

Single-page apps work out of the box. The script counts a new pageview when the path changes through `history.pushState` or the back and forward buttons (`popstate`). `history.replaceState` and changes to the hash alone are not counted.

## What the script sends

| Field | Example | When |
|---|---|---|
| Site ID | from `data-site` | always |
| Event name | `pageview` or your custom event | always |
| Path | `/pricing` (without query string or hash) | always |
| Referrer | `https://www.google.com/` | always |
| UTM parameters | `utm_source`, `utm_medium`, `utm_campaign` (max. 100 characters each) | if present in the URL |
| Favicon URL of your own site | `https://example.com/favicon.ico` | pageviews only |
| Client ID | random ID from the `_lienks_vid` cookie | only in cookie mode, after consent |

## What the script does not do

- It sends no cookies to Lienks (`credentials: "omit"`). In cookie mode the random ID is sent in the request body, see the table above.
- It does not use localStorage or sessionStorage.
- It does not read screen size, language, fonts or anything else about the device.
- It does not track anything inside forms or inputs.

## Tracking modes

You choose the mode per site in the Lienks dashboard. The script learns the mode from the server's first response.

- **Cookieless (default):** the script sets no cookie. How Lienks counts visitors without cookies is explained on [lienks.com/cookieless](https://lienks.com/cookieless).
- **Minimal:** the script also sets no cookie.
- **Cookie:** the script sets a first-party cookie `_lienks_vid` with a random ID, valid for 24 hours. It only does this after you call `setConsent(true)`, for example from your cookie banner. Without consent it behaves like cookieless mode. Because the mode comes from the server's first response, the cookie appears from the next event on.

```js
window.lienks?.setConsent(true);  // visitor accepted
window.lienks?.setConsent(false); // visitor declined, the cookie is deleted
```

The script does not remember consent between page loads. Call `setConsent(true)` on every page load where the visitor has accepted, for example based on the state your cookie banner already stores.

## Custom events

```js
window.lienks?.event("signup");
```

Event names must start with a lowercase letter and may contain lowercase letters, digits and underscores, up to 100 characters. `pageview` is reserved.

## Calling the script before it has loaded

Because the script loads with `defer`, `window.lienks` does not exist until it has run. With `window.lienks?.` nothing breaks, but a call made before that point is lost. This applies to `event` and `setConsent`. Call them after the page has loaded, for example in a `DOMContentLoaded` listener or after a click.

## License

MIT
