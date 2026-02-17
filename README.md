# Familie Nutrition Dashboard (NL)

Prive weekmenu dashboard met pincode, gemaakt met Next.js + Tailwind + Three.js.

## Belangrijk over privacy op GitHub Pages

Deze variant gebruikt een **client-side PIN** (in de browser). Dit is geschikt voor basis-afscherming binnen familie, maar **niet sterk beveiligd** tegen technisch onderlegde gebruikers.

## Lokaal starten

1. Installeer dependencies:

```bash
npm install
```

2. Maak `.env.local` vanuit voorbeeld:

```bash
cp .env.example .env.local
```

3. Genereer hash voor pincode:

```bash
node scripts/hash-pin.mjs 1234
```

4. Zet `NEXT_PUBLIC_FAMILY_PIN_HASH` in `.env.local`.

5. Start development server:

```bash
npm run dev
```

## GitHub Pages deployment

1. Push deze code naar een GitHub repository.
2. In GitHub: `Settings` -> `Secrets and variables` -> `Actions`.
3. Voeg secret toe:
   - `NEXT_PUBLIC_FAMILY_PIN_HASH` (waarde zoals `sha256:<hex>`)
   - optioneel `NEXT_PUBLIC_FAMILY_PIN_PEPPER`
4. In GitHub: `Settings` -> `Pages` -> Source = `GitHub Actions`.
5. Push naar `main`; workflow publiceert automatisch.

Workflow bestand:

- `.github/workflows/deploy-pages.yml`

## Tests

```bash
npm run test
```
