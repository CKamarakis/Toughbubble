## How it works, roughly
Every logo image is made by one script from the original 1024px files and committed. Nothing is edited by hand. The sidebar loads both the light and dark logo, and the page shows the one that matches the theme.

## Why

- **Logo adapts to the theme**: The logo's white lines disappear on a light background, so there is a second version with dark lines. Both versions load on every page, so switching theme never leaves a gap while one loads. Asking the app which theme is on was rejected: the server doesn't know the theme, which would cause a flash. Inverting the colours was rejected because it would change the brand colours too.
- **Logo on the auth pages**: The wordmark is not a heading, so each page's main heading stays the task ("Sign in"), not the brand.
- **Browser and home-screen icons**: Tab icons use the logo on its black disc, which has its own background, so one icon reads on both light and dark browser tabs. The trade-off: the tab icon doesn't follow the app's theme.
