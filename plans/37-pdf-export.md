# Plan 37 — Export PDF de la fiche

## Goal
Generate a print-friendly PDF of any character sheet via Cloud Function. Two styles: "Classic 5e" (familiar paper-RPG look) and "GrimWar" (the app's aesthetic, dark theme adapted for ink/screen). Downloadable from the sheet via button "Exporter en PDF".

## Context
PDF generation strategies: Puppeteer (headless Chrome rendering HTML to PDF — heavy but pixel-perfect) vs pdfkit (low-level drawing — lighter but more work). We choose **Puppeteer** because we can render an existing HTML view to PDF without re-implementing the layout.

## Prerequisites
Sprint 5 plans 34-36 complete.

## Steps

### Print-friendly HTML view
- [ ] 1. Create `/print/character/:ownerId/:id?style=classic|grimwar` route.
- [ ] 2. `<CharacterPrintView />`: renders the character on an A4-proportioned layout. No interactive elements. Print-CSS optimized.
- [ ] 3. **Classic style** template: 2-page layout, columnar, looks like the traditional 5e character sheet PDF — abilities top, skills left, combat right, equipment + spells page 2.
- [ ] 4. **GrimWar style** template: 1-2 page layout, glass panels rendered as solid panels, gold accents preserved, aurora replaced with a subtle parchment texture for print.
- [ ] 5. Print CSS: `@page { size: A4; margin: 10mm }`, force background colors with `print-color-adjust: exact`.

### Cloud Function
- [ ] 6. `functions/src/exportCharacterPDF.ts`:
    - HTTPS callable
    - Input: `{ characterOwnerId, characterId, style: 'classic' | 'grimwar' }`
    - Auth: caller must be the owner OR a DM of a campaign the character is in
    - Launches Puppeteer with `puppeteer-core` + `@sparticuz/chromium` (Cloud Functions compatible)
    - Navigates headless Chrome to `https://<your-domain>/print/character/:ownerId/:id?style=...`
    - Authenticated session via a temporary token (signed JWT in URL)
    - Waits for `networkidle0`
    - Calls `page.pdf({ format: 'A4', printBackground: true })`
    - Uploads PDF to Storage at `exports/{callerUid}/character-{id}-{timestamp}.pdf`
    - Returns signed URL (24h)

### Auth handoff
- [ ] 7. Cloud Function generates a short-lived JWT signed with a server secret (or uses Firebase Custom Token).
- [ ] 8. The print view at `/print/character/:id` accepts this token via query param `?authToken=...`, authenticates on mount, fetches the character, renders.

### Sheet UI
- [ ] 9. Add "Exporter en PDF" button in Settings tab of the character sheet (or in DM omniedit toolbar for DM exports).
- [ ] 10. On click: show style picker modal → calls function → shows download link when ready. Loading state with progress hint ("Génération en cours… ~10s").

### Quality
- [ ] 11. PDF fonts: Cinzel Decorative + Inter embedded. Verify font files load in headless Chrome (use `font-display: block` for PDF context).
- [ ] 12. Tests: 1 unit (PDF function with mocked Puppeteer), 1 visual snapshot (HTML view).

### Cost / performance
- [ ] 13. Puppeteer cold start ~3-5s. Cache busted images. Keep function under 60s timeout.
- [ ] 14. Budget alert: if export volume > 1000/month, consider client-side generation as fallback (jsPDF).

### Final
- [ ] 15. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 16. Commit: `feat(export): PDF character sheet — classic + grimwar styles (plan 37)`

## Definition of Done
- [ ] PDF generates for any character (owner or DM-accessible)
- [ ] Both styles render correctly on A4
- [ ] Download URL returns within 15s
- [ ] Owner-locked permissions respected
- [ ] No data leakage (the print URL requires auth token)

## Notes for next plan
- Plan 38 (spell sigils) is purely cosmetic — no data model change.
- Post-v1 ideas: PDF export of full campaign journal, PDF export of session sheet (all PJ states at end of session).
