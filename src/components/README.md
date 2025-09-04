# Components

This directory contains all reusable components for the application.

## Structure

```
src/components/
├── icons/           # SVG icon components
├── layout/          # Layout components (Header, Hero, Footer, etc.)
├── ui/              # shadcn/ui components
└── README.md        # This file
```

## Layout Components

### Header

- **Location**: `src/components/layout/header.tsx`
- **Purpose**: Site header with navigation and GitHub button
- **Exports**: `Header`, `Navigation`, `GitHubButton`

### Hero

- **Location**: `src/components/layout/hero.tsx`
- **Purpose**: Main hero section with profile image and CTA buttons
- **Exports**: `Hero`, `ProfileImage`, `HeroContent`

### Footer

- **Location**: `src/components/layout/footer.tsx`
- **Purpose**: Site footer with links and social icons
- **Exports**: `Footer`, `QuickLinks`, `SocialLinks`

### Background

- **Location**: `src/components/layout/background.tsx`
- **Purpose**: Circuit grid background and gradient overlay
- **Exports**: `Background`, `CircuitBackground`, `GradientOverlay`

## UI Components

### LinkButton

- **Location**: `src/components/ui/link-button.tsx`
- **Purpose**: Reusable button component for internal/external links
- **Props**: `href`, `external?`, `children`, `className?`, `variant?`, `size?`

## Icon Components

### GitHubIcon

- **Location**: `src/components/icons/github.tsx`
- **Purpose**: GitHub logo SVG component

### LinkedInIcon

- **Location**: `src/components/icons/linkedin.tsx`
- **Purpose**: LinkedIn logo SVG component

### DownloadIcon

- **Location**: `src/components/icons/download.tsx`
- **Purpose**: Download arrow SVG component

## Usage

All layout components can be imported from the index file:

```tsx
import { Header, Hero, Footer, Background } from "@/components/layout";
```

Individual components can also be imported directly:

```tsx
import { Header } from "@/components/layout/header";
import { GitHubIcon } from "@/components/icons/github";
```

## Styling

Components use Tailwind CSS with custom utilities defined in `src/styles/globals.css`:

- `.bg-example-background` - Main background color
- `.text-example-text` - Main text color
- `.border-example-border` - Border color
- `.bg-example-primary` - Primary accent color
- `.bg-example-secondary` - Secondary color
- `.hover:bg-example-accent` - Hover accent color
- `.text-example-primary` - Primary text color
- `.hover:text-example-primary` - Hover text color
- `.circuit-bg` - Circuit grid background pattern
