# PrintBothSides

PrintBothSides is a client-only tool for placing two local images on one A4 portrait PDF page. Images are decoded and processed in the browser only; the app has no API routes, storage, authentication, uploads, or server actions.

## Local development

Install dependencies and start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose two images, adjust their position, width, and rotation, then download the generated PDF.

## Static deployment

The project uses Next.js static export. Build it with:

```bash
npm run build
```

This writes a fully static site to the `out/` directory. Upload the contents of `out/` to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, Amazon S3, or an Nginx/Apache server. Configure the host to serve `index.html` for directory requests.

## Quality checks

```bash
npm run lint
npm run build
```
