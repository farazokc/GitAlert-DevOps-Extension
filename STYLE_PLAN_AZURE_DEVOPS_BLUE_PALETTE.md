# Style Plan: Azure DevOps Blue Palette

## Goal

Replace the current GitHub-dark popup palette with an Azure DevOps-aligned blue palette while preserving the current layout and interaction model.

## Palette Direction

Use Azure DevOps blue as the primary accent for:

- primary buttons
- active tabs
- verification-related actions
- toggles
- loading accents
- repository discovery actions

Keep teal as a success color only, not the primary brand color.

## New Root Tokens

Replace the current `:root` block with:

```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #162033;
  --bg-tertiary: #1e293b;
  --border: #2b3a55;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --green: #00b294;
  --green-dim: #0078d4;
  --blue: #50b0ff;
  --orange: #ffb020;
  --red: #e74856;
  --purple: #8b5cf6;
}
```

## Semantic Meaning

- `--green-dim` becomes the Azure DevOps primary action blue
- `--green` becomes success teal
- `--blue` becomes a lighter secondary highlight blue
- background tokens shift from GitHub charcoal to cooler DevOps navy tones

## Hardcoded Neutral Replacements

Apply these replacements globally in `src/popup/styles.css`:

1. `#484f58` -> `#3b4c6b`
2. `#30363d` -> `#2b3a55`
3. `#9ca3af` -> `#94a3b8`

## RGBA Replacement Rules

### Primary / Action State Green RGBA -> Azure Blue RGBA

- `rgba(63, 185, 80, 0.4)` -> `rgba(0, 120, 212, 0.35)`
- `rgba(63, 185, 80, 0.12)` -> `rgba(0, 120, 212, 0.14)`
- `rgba(63, 185, 80, 0.25)` -> `rgba(0, 120, 212, 0.28)`
- `rgba(63, 185, 80, 0.3)` -> `rgba(0, 120, 212, 0.28)`
- `rgba(63, 185, 80, 0.1)` -> `rgba(0, 120, 212, 0.1)`

### Existing Blue RGBA -> Brighter Azure Blue RGBA

- `rgba(88, 166, 255, 0.15)` -> `rgba(80, 176, 255, 0.14)`
- `rgba(88, 166, 255, 0.3)` -> `rgba(80, 176, 255, 0.28)`

### Red RGBA -> Fluent-Style Red RGBA

- `rgba(248, 81, 73, 0.1)` -> `rgba(231, 72, 86, 0.1)`
- `rgba(248, 81, 73, 0.12)` -> `rgba(231, 72, 86, 0.12)`
- `rgba(248, 81, 73, 0.15)` -> `rgba(231, 72, 86, 0.15)`
- `rgba(248, 81, 73, 0.25)` -> `rgba(231, 72, 86, 0.25)`
- `rgba(248, 81, 73, 0.3)` -> `rgba(231, 72, 86, 0.3)`
- `rgba(248, 81, 73, 0.35)` -> `rgba(231, 72, 86, 0.35)`

### Orange RGBA

- `rgba(210, 153, 34, 0.3)` -> `rgba(255, 176, 32, 0.28)`

### Purple RGBA

- `rgba(188, 140, 255, 0.3)` -> `rgba(139, 92, 246, 0.28)`

## Section-By-Section Styling Impact

### Header And Shell

- background tokens update automatically via the new root palette
- hover borders should use the new neutral replacement

### Inputs And Focus

- focus already uses `var(--blue)`
- after token replacement, focus rings become Azure-aligned automatically

### Primary Buttons

- `.btn-primary` uses `--green-dim`
- after token replacement, this becomes Azure DevOps blue
- update any green-based RGBA borders to blue RGBA

### Tabs

- active tab underline should use Azure primary blue, not success green

### Active Tab Badge

- active badge already uses `--green-dim`
- becomes brand blue automatically

### Stats Cards

Recommended value mapping:

- assigned to review -> `--green-dim`
- my PRs pending -> `--blue`
- changes requested -> `--orange`
- total open PRs -> `--purple`

### PR List Icons

- open PR icon should use Azure primary blue instead of green
- changes icon should remain orange

### PR Labels

- default labels should keep blue styling using updated blue RGBA
- urgent labels should remain red using updated red RGBA

### Repo List

- repo names already use `var(--blue)` and will become Azure-aligned automatically

### Discovery Panel

- connected badge and add icon currently use green accents
- change both to Azure blue accents

### Toggles

- on state should use Azure primary blue for both background and border

### About Tab

- brand-emphasis text and hover accents should use Azure primary blue
- dev avatar may continue using the primary token, which will now be blue

### Loading Spinner

- spinner top color should use Azure primary blue

## Specific Selector Changes

Apply these direct selector updates in addition to the token and RGBA replacements.

### `.tab.active`

Replace:

```css
border-bottom-color: var(--green);
```

With:

```css
border-bottom-color: var(--green-dim);
```

### `.stat-card.green .stat-value`

Replace:

```css
color: var(--green);
```

With:

```css
color: var(--green-dim);
```

### `.pr-icon.open`

Replace:

```css
color: var(--green);
```

With:

```css
color: var(--green-dim);
```

### `.toggle.on`

Replace the border color so both use Azure primary blue:

```css
background: var(--green-dim);
border-color: var(--green-dim);
```

### `.discovery-item .status-badge`

Replace green-based color, background, and border with blue equivalents.

### `.discovery-item .add-icon`

Replace green-based color and background with blue equivalents.

### `.about-tagline-main span`

Replace:

```css
color: var(--green);
```

With:

```css
color: var(--green-dim);
```

### `.about-header-actions a:hover`

Replace:

```css
color: var(--green);
```

With:

```css
color: var(--green-dim);
```

### `.spinner`

Replace:

```css
border-top-color: var(--green);
```

With:

```css
border-top-color: var(--green-dim);
```

## Optional Follow-Up Cleanup

Later, rename tokens for semantic clarity:

- `--green-dim` -> `--accent-primary`
- `--green` -> `--success`

This is optional and not required for the first palette pass.

## Recommended Execution Order

1. Replace the `:root` token block
2. Replace hardcoded neutrals
3. Replace action-state green RGBA values with Azure blue RGBA values
4. Update selector exceptions:
   - active tabs
   - assigned stat card
   - open PR icon
   - toggles
   - discovery add and connected badges
   - about accent text and links
   - spinner
5. Reload the extension and visually verify

## Visual Verification Checklist

After applying the palette:

1. Connect button is Azure DevOps blue
2. Active tab underline is blue
3. Verified identity action states feel blue-led, not green-led
4. Repo discovery add button and connected badge are blue
5. Toggles use Azure blue when on
6. Open PR icon uses Azure blue
7. Dashboard still preserves orange/red/purple semantic states correctly
8. About tab accents align with the new DevOps palette

## Expected Outcome

- same layout and structure
- cooler DevOps-style dark theme
- Azure DevOps blue becomes the dominant product accent
- success teal remains available but no longer acts as the primary brand color
