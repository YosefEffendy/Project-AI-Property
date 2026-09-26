This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Project AI development prerequisites

Install the locked dependencies with `npm ci` (or use `npm install`). Configure
an ignored `.env.local` with your own `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never use a Supabase service-role or
private key in browser configuration or commit local environment files.

The application requires the existing Supabase schema, storage and access
policies. This repository does not currently include a complete database
migration/setup procedure; dependency installation alone will not provision it.

### Type checking

The root layout uses Next.js's generated `LayoutProps` helper. On a fresh
checkout, or after removing `.next`, generate the framework types first:

```bash
npx next typegen
npx tsc --noEmit
```

`next typegen` is provided by the installed Next.js version and does not require
a full build. `npm run dev` and `npm run build` also generate these types.
Do not edit or version-control `.next` or `next-env.d.ts`.

Run `npm run build` for production validation. The configured Google fonts may
require network access during the build.

### Existing lint debt

At the Git baseline checkpoint, `npm run lint` reports six existing errors
(two in Add Listing and four in Manage Listing) and six warnings. The Buyer
Marketplace files have no lint errors. This debt is recorded for a separate
engineering cleanup; no application functionality was changed for the checkpoint.
