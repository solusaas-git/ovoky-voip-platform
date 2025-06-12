 # Branding System Documentation

This document explains how the dynamic branding system works in the application and how to use it throughout your codebase.

## Overview

The branding system allows administrators to customize the visual appearance and company information throughout the entire application. This includes:

- Company name and slogan
- Logo and favicon
- Color scheme (primary, secondary, accent colors)
- Typography settings
- Visual effects (animations, glass morphism, gradients)
- Contact information and social links
- Custom CSS for advanced styling

## Architecture

### Core Components

1. **BrandingSettings Model** (`src/models/BrandingSettings.ts`)
   - MongoDB schema for storing branding configuration
   - Includes validation for colors, URLs, and other settings

2. **BrandingContext** (`src/lib/BrandingContext.tsx`)
   - React context that provides branding settings throughout the app
   - Handles loading, updating, and applying branding changes

3. **useBranding Hook** (`src/hooks/useBranding.ts`)
   - Custom hook for easy access to branding settings
   - Provides helper functions for common branding needs

4. **Branding Utilities** (`src/lib/brandingUtils.ts`)
   - Utility functions for applying branding to the DOM
   - Handles CSS variables, favicon updates, and custom styling

5. **BrandLogo Component** (`src/components/ui/brand-logo.tsx`)
   - Reusable component for displaying company logo and name
   - Automatically uses branding settings

## Usage

### Basic Usage

```tsx
import { useBranding } from '@/hooks/useBranding';

function MyComponent() {
  const { company, colors, features } = useBranding();
  
  return (
    <div>
      <h1>{company.name}</h1>
      <p>{company.slogan}</p>
      <div style={{ color: colors.primary }}>
        Branded content
      </div>
    </div>
  );
}
```

### Using the BrandLogo Component

```tsx
import { BrandLogo } from '@/components/ui/brand-logo';

function Header() {
  return (
    <header>
      <BrandLogo size="lg" />
    </header>
  );
}
```

### Accessing Specific Settings

```tsx
import { useBranding } from '@/hooks/useBranding';

function ContactInfo() {
  const { getSupportEmail, getSupportEmailLink } = useBranding();
  
  return (
    <div>
      <p>Support: {getSupportEmail()}</p>
      <a href={getSupportEmailLink('Help Request')}>
        Contact Support
      </a>
    </div>
  );
}
```

### Email Templates

For email templates, use the branding settings to customize appearance:

```tsx
// In email service
const brandingSettings = await BrandingSettings.getSettings();
const emailContent = createEmailTemplate({
  companyName: brandingSettings?.companyName || 'Default Company',
  primaryColor: brandingSettings?.primaryColor || '#7c3aed',
  supportEmail: brandingSettings?.supportEmail || 'support@example.com'
});
```

## Available Settings

### Company Information
- `companyName`: Company name displayed throughout the app
- `companySlogan`: Tagline or slogan
- `logoUrl`: URL to company logo image
- `faviconUrl`: URL to favicon
- `logoAltText`: Alt text for logo accessibility

### Colors
- `primaryColor`: Main brand color (default: #7c3aed - violet)
- `secondaryColor`: Secondary brand color (default: #a855f7 - purple)
- `accentColor`: Accent color for highlights (default: #06b6d4 - cyan)
- `backgroundColor`: Main background color (default: #ffffff)
- `textColor`: Primary text color (default: #1f2937)
- `surfaceColor`: Card/surface backgrounds (default: #f9fafb)

### Dark Mode Colors

Dark mode specific colors automatically applied when dark theme is active:

- `darkPrimaryColor`: Primary color for dark mode (default: #a78bfa)
- `darkSecondaryColor`: Secondary color for dark mode (default: #c084fc)
- `darkAccentColor`: Accent color for dark mode (default: #22d3ee)
- `darkBackgroundColor`: Background for dark mode (default: #0f172a)
- `darkTextColor`: Text color for dark mode (default: #f1f5f9)
- `darkSurfaceColor`: Surface color for dark mode (default: #1e293b)

### Gradient Colors

Used for authentication page backgrounds:

- `gradientStartColor`: Gradient start color (default: #7c3aed)
- `gradientMiddleColor`: Gradient middle color (default: #a855f7)
- `gradientEndColor`: Gradient end color (default: #3b82f6)

### Auth Form Background Colors

Customize the background colors of the form side of authentication pages:

- `authFormBackgroundColor`: Background color for login/signup forms in light mode (default: #ffffff)
- `darkAuthFormBackgroundColor`: Background color for login/signup forms in dark mode (default: #0f172a)

These colors allow you to create a unique branded experience for your authentication pages while maintaining the branding panel's gradient background.

### Typography
- `fontFamily`: Primary font family
- `headingFontFamily`: Font family for headings
- `borderRadius`: Default border radius

### Contact Information
- `contactEmail`: General contact email
- `supportEmail`: Support email address
- `websiteUrl`: Company website URL
- `socialLinks`: Object containing social media URLs

### Features
- `enableAnimations`: Enable/disable animations
- `enableGlassMorphism`: Enable/disable glass morphism effects
- `enableGradientBackground`: Enable/disable gradient backgrounds
- `customCss`: Custom CSS for advanced styling

## Helper Functions

The `useBranding` hook provides several helper functions:

### Basic Getters
- `getCompanyName()`: Get company name with fallback
- `getCompanySlogan()`: Get company slogan with fallback
- `getLogoUrl()`: Get logo URL
- `getPrimaryColor()`: Get primary color with fallback
- `getSupportEmail()`: Get support email with fallback

### Style Helpers
- `getGradientStyle()`: Get gradient CSS object
- `getGlassMorphismStyle()`: Get glass morphism CSS object
- `getSupportEmailLink(subject)`: Generate mailto link with subject

### Quick Access Objects
- `company`: Object with all company information
- `colors`: Object with all color settings
- `features`: Object with feature flags

## CSS Variables

The branding system automatically applies CSS custom properties:

```css
:root {
  --brand-primary: #7c3aed;
  --brand-secondary: #a855f7;
  --brand-accent: #06b6d4;
  --brand-background: #ffffff;
  --brand-text: #1f2937;
  --brand-surface: #f9fafb;
  --brand-gradient-start: #7c3aed;
  --brand-gradient-middle: #a855f7;
  --brand-gradient-end: #3b82f6;
  --brand-auth-form-bg: #ffffff;
  --brand-auth-form-bg-dark: #0f172a;
  --brand-font-family: 'Inter, sans-serif';
  --brand-heading-font-family: 'Inter, sans-serif';
  --brand-border-radius: 0.75rem;
}
```

You can use these in your CSS:

```css
.my-component {
  background-color: var(--brand-primary);
  color: var(--brand-background);
  border-radius: var(--brand-border-radius);
  font-family: var(--brand-font-family);
}
```

## Admin Configuration

Administrators can configure branding through the Settings > Branding page, which includes:

1. **Company Information**: Name, slogan, logo upload
2. **Color Scheme**: Primary, secondary, accent colors with color pickers
3. **Typography**: Font families and styling options
4. **Contact Information**: Email addresses and website URL
5. **Social Media**: Links to social media profiles
6. **Advanced Options**: Custom CSS and feature toggles

## Best Practices

1. **Always use the branding hook**: Don't hardcode company names or colors
2. **Provide fallbacks**: Use the helper functions that include default values
3. **Test with different settings**: Ensure your components work with various branding configurations
4. **Use semantic naming**: Prefer `colors.primary` over hardcoded hex values
5. **Respect feature flags**: Check `features.animations` before adding animations

## Examples

### Dynamic Page Title
```tsx
import { useBranding } from '@/hooks/useBranding';
import { useEffect } from 'react';

function MyPage() {
  const { getCompanyName } = useBranding();
  
  useEffect(() => {
    document.title = `My Page - ${getCompanyName()}`;
  }, [getCompanyName]);
  
  return <div>Page content</div>;
}
```

### Branded Button
```tsx
import { useBranding } from '@/hooks/useBranding';

function BrandedButton({ children, ...props }) {
  const { colors } = useBranding();
  
  return (
    <button
      style={{
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: 'var(--brand-border-radius)',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Conditional Features
```tsx
import { useBranding } from '@/hooks/useBranding';
import { motion } from 'framer-motion';

function AnimatedCard({ children }) {
  const { features } = useBranding();
  
  const Component = features.animations ? motion.div : 'div';
  const animationProps = features.animations ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  } : {};
  
  return (
    <Component {...animationProps}>
      {children}
    </Component>
  );
}
```

This branding system ensures consistent theming throughout the application while allowing for easy customization by administrators.