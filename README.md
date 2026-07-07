# Burger Lions — AR Menu

A WebAR restaurant menu. Customers browse 3D food models and place them on their table in Augmented Reality — no app download required.

## Live


## How it works

| Platform | Tap "VIEW ON TABLE" |
|---|---|
| Android (Chrome + ARCore) | Three.js WebXR carousel — hit-test placement, drag to move, twist to rotate |
| iOS (Safari) | ARKit Quick Look via model-viewer `activateAR()` |
| Everything else | "VIEW IN 3D" — fullscreen model-viewer modal |

Thumbnail tap opens the fullscreen 3D preview on all platforms.

## Development

```bash
npm install
npm run dev   # http://localhost:3000
```

No build step. Pure static files.

## Menu data

Edit `foods/menu.json` to add, remove, or update items:

```json
{
  "name": "Druidi",
  "name_ka": "დრუიდი",
  "description": "Ancient grain bowl with roasted herbs...",
  "description_ka": "ძველი მარცვლეულის თასი...",
  "price": "$18.99",
  "model": "Druidi.glb"
}
```

Place GLB model files in the project root. Update the `"model"` field to point to the new file.

## Adding a new dish

1. Add the GLB file to the project root (or a subfolder)
2. Add an entry to `foods/menu.json` with `name`, `name_ka`, `description`, `description_ka`, `price`, `model`
3. Commit and push — GitHub Pages deploys automatically

## Languages

Georgian / English toggle (top-left button). Selection persists via `localStorage`.
