# Packaging Label Positioning (Sticker Sheets)

This guide explains how to align Packaging labels on pre-cut sticker sheets (A4 or custom formats) using Layout Presets, Start Position, and Offsets.

## Concepts

### Layout Preset
A Layout Preset describes your sticker sheet:
- Page size (width/height)
- Number of label columns and rows
- Label size (width/height)
- Margins (left/top)
- Gaps (horizontal/vertical)
- Printer calibration offsets (X/Y)
- Default Start Position
- Default printed fields (Header, QR, Barcode, etc.)

### Start Position (Offset Printing)
Start Position lets you begin printing from any label cell on the sheet.

Example:
- Your sheet has 10 labels (2 columns × 5 rows).
- The first 4 labels are already used.
- Set Start Position to 5.
- The next printed labels will automatically go to 5, 6, 7, 8… (and continue to the next page if needed).

### Offset X / Offset Y (Printer Calibration)
Offsets move all labels slightly to correct printer misalignment.
- Offset X moves labels left/right.
- Offset Y moves labels up/down.

Use small increments (0.2–1.0 mm) to fine-tune alignment.

## Configure the Sheet (Save/Load Presets)

1. Go to Settings → Packaging.
2. Scroll to Sticker Sheet Layout.
3. Choose an existing preset or create/update one:
   - Set Units (mm or inches).
   - Set Page Width/Height and Columns/Rows.
   - Set Label Width/Height.
   - Set Margins and Gaps.
   - Set Offset X/Y.
   - Set Start Position.
4. Mark Default Preset to use it automatically when printing.
5. Click Save Preset.

## Print Preview + Field Selection

1. Go to Packaging Identity → Manage Packaging.
2. Select items.
3. Click Print Selected (or Proceed Anyway if bypassing soft fields).
4. In the Print dialog:
   - Choose a Layout Preset.
   - Enable/disable fields (Header, QR, Barcode, MRP, Origin, Weight, Footer).
   - Set Start Position by:
     - Typing a number, or
     - Clicking the grid position.
5. Confirm placement in the Preview panel.
6. Click Print.

## Test Print (Recommended)

Before printing production labels on a new sheet:
1. Open the Print dialog.
2. Click Test Print Sheet.
3. Print on a blank sheet or plain paper.
4. Place the test print behind your sticker sheet (against a light source) to confirm alignment.
5. Adjust margins, gaps, and Offset X/Y until the grid aligns perfectly.

## Error Prevention

The system prevents printing when the layout does not fit the page:
- If labels + gaps + margins exceed page width/height, printing is blocked until fixed.
- Start Position is limited to the number of cells (rows × columns).

## Tips for Inkjet Printers

- Use “Actual size” or “100% scale” in the print dialog (avoid “Fit to page”).
- Disable extra margins added by the printer driver when possible.
- Always verify with Test Print after changing paper brand or printer settings.

