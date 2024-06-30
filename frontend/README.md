## Overview

We use React + Typescript + Tailwindcss. For UI and design, we try to stick to TailwindUI components as much as possible, and HeroIcons for icons.

Rest should be self-explanatory!

## Installation

`npm install`

## Running

You should make sure the backend is running for this part (port 7377).

```
export NODE_ENV=local
npm run dev
```

## Authentication

Known issues:

- Changing the credentials while users are logged in (have cookies) will result in them getting 401s for all requests. To fix this: Logout then login again. Not pretty but it works.
