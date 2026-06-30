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

## Cloudflare R2 asset setup

The admin upload flow uses R2 only when these env vars are present. It does not create buckets or delete assets automatically.

1. Cloudflare Dashboard -> Storage & databases -> R2 Object Storage -> Create bucket.
2. Suggested bucket name: `betareal-assets`.
3. Create/manage an R2 API token with Object Read & Write for that bucket.
4. Add Vercel Production env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
5. `R2_PUBLIC_URL` requires enabling public `r2.dev` access or adding a custom public domain later.

## Runtime layout

Current customer sites are not separate hosted apps. They run from the single Cloudflare Pages shared template at `https://restaurant-ar.pages.dev`, with the active branch selected by `?tenant=<branch_slug>`.

The admin runs separately on Vercel at `https://betareal-admin.vercel.app`. Uploaded models and logos go to the Cloudflare R2 bucket `betareal-assets`.

Local dev runs the admin on `http://localhost:3000`; the public static template can be served from the repo root with `npm run dev` or another static server.

Direct browser PUT uploads require R2 bucket CORS. In Cloudflare R2, add a CORS policy like:

```json
[
  {
    "AllowedOrigins": ["https://betareal-admin.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
