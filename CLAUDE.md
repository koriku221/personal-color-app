# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start dev server (Parcel, serves index.html)
npm run build    # Production build → dist/ (public URL set to ./)
npm run deploy   # Build + push to gh-pages branch (GitHub Pages)
```

No test or lint commands are configured.

**If you get a 404 after deploy**, clear the Parcel cache and redeploy:
```bash
Remove-Item -Recurse -Force .parcel-cache   # Windows/PowerShell
rm -rf .parcel-cache                         # macOS/Linux
npm run deploy
```

## Architecture

Vanilla JavaScript SPA (no frameworks) bundled with Parcel. Deployed to GitHub Pages at `https://koriku221.github.io/personal-color-app`. Entirely client-side — no backend.

### Routing & Entry

- `index.html` → `main.js` (entry point, sets up navigation)
- `router.js` — hash-based SPA router. Each route object has `render()`, `onMount()`, `className`, and `title`.
- Routes: `/` and `/pdf-select` → pdf-select.js, `/image-select` → image-select.js, `/result` → result.js

### Global State (`utils.js`)

All cross-page state lives in `utils.js` as module-level exports with setter functions:
- `selectedPdfFile` / `setSelectedPdfFile`
- `selectedImageFiles` / `setSelectedImageFiles` — array of image objects
- `processedPdfBytes` — final PDF output bytes
- `pdfPageSize`, `selectedPdfPage`, `pdfDocumentInstance`, `fontCache`

State is **not persisted** — resets on page refresh.

### Page Modules

| File | Responsibility |
|------|---------------|
| `pdf-select.js` | PDF upload and preview (uses pdf.js for rendering) |
| `image-select.js` | Image upload, HEIC conversion, drag-to-reorder (Sortable.js), real-time preview |
| `options.js` | Image placement configuration (margins, columns, captions, font sizes) |
| `result.js` | Renders and provides download of the final PDF |
| `panel-resizer.js` | Drag-to-resize sidebar panel UI |

### PDF Pipeline

1. User uploads PDF → stored in `selectedPdfFile`
2. User uploads images → stored in `selectedImageFiles` with `pdfEmbedBytes` (HEIC auto-converted to JPEG via heic-convert)
3. Options configured → `options.js` reads/writes placement params
4. Result page: pdf-lib loads original PDF, embeds images at calculated positions, adds captions with custom fonts (via fontkit), outputs new PDF bytes → `processedPdfBytes`

### Key Libraries

- **pdf-lib** — PDF creation and manipulation
- **pdfjs-dist** — PDF rendering to canvas for previews
- **@pdf-lib/fontkit** — Custom font embedding in PDFs
- **heic-convert** — Browser-side HEIC/HEIF → JPEG conversion
- **sortablejs** — Drag-and-drop image reordering
- Extensive Node.js polyfills (Buffer, crypto, zlib) are required for pdf-lib and heic-convert to run in the browser — these are configured in `package.json` under the `browser` field.

### Image Object Structure

```javascript
{
  id: string,              // UUID
  file: File,
  previewUrl: string,      // Data URL
  pdfEmbedBytes: ArrayBuffer,
  pdfEmbedType: 'jpeg' | 'png',
  aspectRatio: number,
  caption: string,
  captionFontSize: number
}
```

### UI Notes

- All UI text is in Japanese (personal color analysis context)
- Fonts for PDF captions are stored in `public/fonts/`
- `style.css` handles all styling (~26KB, single file)
