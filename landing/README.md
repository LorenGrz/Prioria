# Prioria landing (portfolio preview)

Static Next.js site — separate from the mobile app and the backend — used
to showcase Prioria in a portfolio. No server, no API calls: everything on
the page is a static recreation of the mockups for visual preview only.

## Develop

```bash
npm install
npm run dev
```

## Build & deploy (S3 + CloudFront, Origin Access Control)

```bash
npm run build   # writes static site to ./out (next.config.js: output: 'export')
```

Then, one-time infra setup:

```bash
aws s3 mb s3://prioria-landing-<your-suffix>
# create a CloudFront distribution with the bucket as origin, Origin Access
# Control enabled, and the bucket policy restricted to that OAC (no public
# bucket ACLs). Set the default root object to index.html and add a custom
# error response mapping 404 -> /404.html (200) since this is a fully
# static export with no server-side routing.
```

Then, on every deploy:

```bash
aws s3 sync out/ s3://prioria-landing-<your-suffix> --delete
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```
