# Remove AsciiNeuralNet from Sidebar

**Date:** 2026-03-04
**Status:** Approved

## Problem
The AsciiNeuralNet component in the sidebar causes visual distraction with its blinking/pulsing dots. It draws attention away from the actual sidebar content.

## Solution
Remove AsciiNeuralNet entirely. No replacement for now — the sidebar will be cleaner with just the headshot, name/title, /proc/dmytro/status, and ~/.ssh/known_hosts blocks.

## Changes
1. `Sidebar.tsx` — Remove import and usage of AsciiNeuralNet
2. `AsciiNeuralNet.tsx` — Delete file
3. `index.css` — Remove neural-net-container media query (if present)
4. Update memory notes
