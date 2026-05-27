# Image SEO conventions — BabyJourney

This folder holds public images used on the landing page, login screen, and
social shares (Open Graph / Twitter cards).

## Naming

All images use **descriptive, keyword-rich filenames** in PascalCase with
underscores, and the `.webp` extension. The first token is always
`BabyJourney_` so external links are recognizable.

Examples (when these assets are added):

- `BabyJourney_couple_with_little_boy.webp`
- `BabyJourney_Flower_Background.webp`
- `BabyJourney_baby_first_steps.webp`
- `BabyJourney_album_screenshot.webp`

## Format

- **WebP only** for marketing imagery. Smaller files than JPEG/PNG, supported
  on every modern browser.
- Convert from PNG/JPG with `cwebp -q 82 input.png -o output.webp`
  (free tier baseline) or `-q 90` (premium / hero).

## Size targets

| Usage | Max width | Target file size |
|-------|-----------|------------------|
| Hero banner       | 1920 px | < 200 KB |
| Card thumbnail    |  800 px | <  80 KB |
| Profile / avatar  |  400 px | <  40 KB |
| Open Graph card   | 1200 × 630 | < 150 KB |

## Metadata

Every image referenced from a page MUST include:

1. **`alt` attribute** — describe the image *and* embed a primary keyword.
   - Bad:  `alt="photo"`
   - Good: `alt="Părinți din Chișinău cu băiețelul lor — album BabyJourney"`

2. **Open Graph / Twitter `og:image:alt`** — same rules, set in
   `<Head>` on each page (see `pages/login.js` and `pages/demo.js` for the
   pattern).

3. **Location stamp** — when relevant, embed `Chișinău, Moldova` in
   `og:image:alt` and in EXIF GPS / IPTC metadata of the source image.
   Use `exiftool -GPSLatitude=47.0105 -GPSLongitude=28.8638 file.webp`.

4. **No raw uppercase extensions** — `.webp` lowercase. Web servers don't
   normalize and some CDNs cache them separately.

## Where images are referenced

- `pages/login.js`            — `og:image` (social share preview)
- `pages/demo.js`             — `og:image`
- (Future) `pages/index.js`   — landing hero, currently a redirect
- (Future) marketing site     — separate codebase, follow same conventions

## Adding a new image

```bash
# 1. Optimize + convert
cwebp -q 85 source.jpg -o public/img/BabyJourney_descriptive_name.webp

# 2. Tag with location (optional but recommended for SEO)
exiftool -GPSLatitude=47.0105 -GPSLongitude=28.8638 \
  -Location="Chișinău, Moldova" \
  public/img/BabyJourney_descriptive_name.webp

# 3. Reference from a page with full alt text
<Image src="/img/BabyJourney_descriptive_name.webp"
       alt="Descriere bogată cu keywords + Chișinău"
       width={800} height={600} />
```
