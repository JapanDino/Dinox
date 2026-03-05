# Dinox Calendar Figma Structure (P2-01)

This document defines the target Figma frame structure for the MVP calendar UI so implementation can map 1:1 once a Figma file/frame URL is shared.

## Root Frame
- `Dinox / Desktop / 1440`

## Main Regions
1. `Sidebar`
- Width: 300
- Sections:
  - `Projects`
  - `Tags`
  - `Filters`

2. `TopBar`
- `Title`
- `ViewSwitcher` (Month, Week, Day, Agenda)
- `NewButton`

3. `CalendarRegion`
- Primary canvas for month/week/day/agenda views.

## Modals (next phase)
- `ItemModal / CreateEdit`
- `ProjectModal / CreateEdit`
- `TagModal / CreateEdit`

## Visual Tokens
- Background: warm neutral `#F7F6F3`
- Surface: `#FFFFFF`
- Border: `#E7E5DF`
- Text main: `#1F2937`
- Accent: `#2563EB`

## Notes
- This phase ships the structural shell and read-only calendar.
- Exact Figma node IDs will be attached in later phases when a concrete file is provided.
