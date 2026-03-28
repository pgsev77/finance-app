# UI Redesign Plan

## Reference Analysis

| Project | Layout Pattern | Color Philosophy | Spacing |
|---------|---------------|-----------------|---------|
| Linear | Sidebar 240px + Header 56px + Content max-w-none (fluid) | Indigo accent, neutral grays, minimal borders | 8px grid, generous padding |
| Maybe Finance | Sidebar 260px + Breadcrumb header + Content max-w-5xl | Clean white, subtle warm accents, card-based | 12px grid, card-heavy |
| Actual Budget | Sidebar collapsible + No header, content fills | Teal/green accent, compact | Tight, data-dense |
| Firefly III | Top nav + Content max-w-6xl | Blue accent, traditional web | 8px grid |

## Borrowed Elements
- From Linear: Sidebar/header height alignment (both h-14=56px), indigo accent, clean minimal aesthetic, subtle backdrop-blur header
- From Maybe: Card-based content areas, warm refined accent, generous content max-width
- From Actual: Compact sidebar nav with grouped sections

## New Color Scheme

### Light
- bg: #f7f7f8 (subtle warm gray)
- surface: #ffffff
- border: #e4e4e7 (zinc-200)
- text: #18181b (zinc-900)
- text-secondary: #71717a (zinc-500)
- accent: #6366f1 (indigo-500) -- professional, modern
- accent-hover: #4f46e5 (indigo-600)

### Dark
- bg: #09090b (zinc-950)
- surface: #18181b (zinc-900)
- border: #27272a (zinc-800)
- text: #fafafa (zinc-50)
- text-secondary: #a1a1aa (zinc-400)
- accent: #818cf8 (indigo-400)
- accent-hover: #6366f1 (indigo-500)

## Layout System
- Sidebar: w-60 (240px), h-full, brand area h-14
- Header: h-14 (56px) -- aligned with sidebar brand
- Content: max-w-5xl (1024px), p-4 lg:p-6
- Nav grouping: Main (仪表盘/交易) | Reports (报表) | Bottom (设置/用户/退出)

## Spacing
- Global content padding: p-4 lg:p-6
- Card padding: p-5 lg:p-6
- Card gap: space-y-6
- Nav item: py-2.5 px-3
- Nav group gap: space-y-1
- Group separator: py-3
