# Webflow CMS Toolkit

A custom-built automation tool for managing Webflow CMS collections at scale. Built by Perception Marketing.

## Features

### CMS Manager
- Connect to any Webflow site via API token
- Browse all CMS collections and their schemas
- View, add, and delete collection fields
- Preview existing collection items
- Export collection schemas and items as JSON

### Data Importer
- Upload CSV or JSON files for bulk import
- Auto-map fields with matching names
- Manual field mapping interface
- Dry-run mode to preview changes before committing
- Download collection templates as CSV

### Image Processor
- Upload multiple images for batch processing
- Interactive crop with drag-and-drop adjustment
- Preset dimensions:
  - Main Photo: 1920×1080
  - Gallery: 1200×800
  - Square: 1000×1000
  - Vertical: 800×1200
  - Custom: Any dimensions
- Quality presets (High 92%, Balanced 85%, Optimized 75%)
- Output formats: WebP, JPEG, PNG
- Custom filename patterns with variables
- Batch download processed images

## Quick Start

### Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify
3. Deploy with default settings (auto-detected from `netlify.toml`)

Or use the Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Local Development

```bash
npm install
npm run dev
```

## Getting Your Webflow API Token

1. Go to your Webflow dashboard
2. Click your workspace settings (gear icon)
3. Navigate to **Integrations** → **API Access**
4. Generate a new API token
5. Copy and paste into the toolkit

**Required scopes:**
- `sites:read`
- `cms:read`
- `cms:write`

## Usage

### CMS Manager

1. Enter your Webflow API token
2. Select your site from the dropdown
3. Click any collection to view its schema
4. Add new fields or export existing data

### Bulk Data Import

1. Connect to Webflow
2. Go to **Data Import** tab
3. Upload your CSV or JSON file
4. Select target collection
5. Map source columns to collection fields
6. Preview with **Dry Run**, then **Run Import**

### Image Processing

1. Go to **Image Processor** tab
2. Drag images or click to upload
3. Select an image from the queue
4. Choose size preset and quality
5. Adjust crop area as needed
6. Click **Process Image** or **Process All**
7. Download processed images

## File Structure

```
webflow-cms-toolkit/
├── src/
│   ├── components/
│   │   ├── CMSManager.jsx      # Collection browser & schema editor
│   │   ├── DataImporter.jsx    # CSV/JSON bulk import
│   │   └── ImageProcessor.jsx  # Crop & resize tool
│   ├── utils/
│   │   ├── webflow.js          # Webflow API client
│   │   └── imageProcessing.js  # Image manipulation utilities
│   ├── App.jsx                 # Main application
│   ├── main.jsx               # Entry point
│   └── index.css              # Styles (Tailwind + custom)
├── public/
│   └── favicon.svg
├── netlify.toml               # Netlify deployment config
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Cropper.js** - Image cropping
- **PapaParse** - CSV parsing
- **Lucide React** - Icons

## Webflow API Notes

- Rate limited to ~60 requests/minute
- Bulk imports are processed sequentially with delays
- Some system fields cannot be modified (slug, created, etc.)
- Images must be uploaded to Webflow Assets separately

## Customization

### Adding Image Presets

Edit `src/utils/imageProcessing.js`:

```javascript
export const IMAGE_PRESETS = {
  'thumbnail': { width: 400, height: 400, label: 'Thumbnail (400×400)' },
  // Add your presets here
};
```

### Styling

Colors are defined in `tailwind.config.js` under the `pm-*` namespace. The design matches the Night Stalker Foundation brand palette.

---

Built by [Perception Marketing](https://perceptionmarketingbrand.com)
