# Theme Refinement Design

## Summary

Replace white, darcula, and gruvbox themes with Tokyo Night and One Dark Pro. Final theme list: `green`, `amber`, `tokyo-night`, `one-dark-pro`.

## Theme Color Palettes

### Tokyo Night

| Variable | Value |
|---|---|
| `--terminal-primary` | `#7AA2F7` |
| `--terminal-primary-dim` | `#565F89` |
| `--terminal-primary-dark` | `#3B4261` |
| `--terminal-bg` | `#1A1B26` |
| `--terminal-surface` | `#24283B` |
| `--terminal-border` | `#3B4261` |
| `--terminal-gray` | `#565F89` |
| `--terminal-error` | `#F7768E` |
| `--terminal-output` | `#A9B1D6` |
| `--terminal-glow` | `rgba(122, 162, 247, 0.15)` |
| `--terminal-glow-soft` | `rgba(122, 162, 247, 0.05)` |
| `--terminal-scanline` | `rgba(0, 0, 0, 0.02)` |
| `--terminal-vignette` | `rgba(0, 0, 0, 0.3)` |

### One Dark Pro

| Variable | Value |
|---|---|
| `--terminal-primary` | `#61AFEF` |
| `--terminal-primary-dim` | `#5C6370` |
| `--terminal-primary-dark` | `#4B5263` |
| `--terminal-bg` | `#282C34` |
| `--terminal-surface` | `#2C313A` |
| `--terminal-border` | `#3E4452` |
| `--terminal-gray` | `#5C6370` |
| `--terminal-error` | `#E06C75` |
| `--terminal-output` | `#ABB2BF` |
| `--terminal-glow` | `rgba(97, 175, 239, 0.15)` |
| `--terminal-glow-soft` | `rgba(97, 175, 239, 0.05)` |
| `--terminal-scanline` | `rgba(0, 0, 0, 0.02)` |
| `--terminal-vignette` | `rgba(0, 0, 0, 0.25)` |

## Headshot Filters

- **green:** `grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)`
- **amber:** `grayscale(100%) sepia(80%) saturate(200%)`
- **tokyo-night:** `grayscale(100%) sepia(20%) hue-rotate(190deg) saturate(200%) brightness(0.9)`
- **one-dark-pro:** `grayscale(100%) sepia(15%) hue-rotate(180deg) saturate(150%) brightness(0.9)`

## Easter Eggs (first use, localStorage-gated)

- **Tokyo Night:** "Welcome to Neo-Tokyo. The night shift begins."
  - Key: `dkoder-tokyo-night-seen`
- **One Dark Pro:** "Dark mode activated. Your eyes will thank you."
  - Key: `dkoder-one-dark-pro-seen`

## Files to Update

1. `src/index.css` - Remove white/darcula/gruvbox CSS, add tokyo-night and one-dark-pro
2. `src/ThemeContext.tsx` - Update ThemeName type and VALID_THEMES array
3. `index.html` - Update inline script theme list
4. `src/components/Sidebar.tsx` - Update HEADSHOT_FILTERS map

## Migration

Users with removed themes in localStorage fall back to green (default) via existing validation in getInitialTheme().
