# Multi-Language Implementation Guide

## Overview
This guide documents the multi-language (i18n) implementation for the OVOKY VoIP platform, supporting English and French languages.

## Architecture

### Client-Side i18n System
- **Location**: `src/lib/i18n.ts`
- **Type**: Client-side internationalization system (no routing changes)
- **Languages**: English (en), French (fr)
- **Storage**: localStorage for user preferences
- **Fallback**: English for missing translations

### Key Components

#### 1. Translation Files
- **English**: `src/i18n/messages/en.json`
- **French**: `src/i18n/messages/fr.json`
- **Structure**: Nested JSON with namespaced keys (common, dashboard, auth, etc.)

#### 2. Language Switcher
- **Component**: `src/components/ui/LanguageSwitcher.tsx`
- **Variants**: dropdown, select, button
- **Locations**: 
  - Mobile header
  - Desktop sidebar
  - Settings page (select variant)

#### 3. Admin Language Settings
- **Component**: `src/components/settings/GeneralSettings.tsx`
- **Features**:
  - Set default system language
  - Enable/disable languages
  - Enforce language (prevent user changes)

#### 4. Database Models
- **User Preferences**: `src/models/UserLanguagePreference.ts`
- **System Settings**: `src/models/SystemLanguageSettings.ts`

#### 5. API Endpoints
- **User Preferences**: `/api/user/language-preference`
- **Admin Settings**: `/api/admin/language-settings`

## Usage

### In Components
```jsx
import { useTranslations } from '@/lib/i18n';

function MyComponent() {
  const { t, locale, setLocale } = useTranslations();
  
  return (
    <div>
      <h1>{t('dashboard.welcome', { name: 'John' })}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### Translation Keys
```json
{
  "dashboard": {
    "welcome": "Welcome back, {name}!",
    "account": "Account"
  }
}
```

### Parameter Substitution
```jsx
// English: "Welcome back, {name}!"
// French: "Bienvenue, {name} !"
t('dashboard.welcome', { name: 'John' })
```

## Admin Configuration

### Settings Location
1. Navigate to **Settings**
2. Go to **General** tab
3. Configure **Language Settings**

### Available Options
- **Default Language**: System-wide default for new users
- **Available Languages**: Which languages users can select
- **Enforce Language**: Prevent users from changing language

## User Language Selection

### Language Switcher Locations
1. **Mobile**: Top header (dropdown)
2. **Desktop**: Sidebar profile section (dropdown)
3. **Settings**: General tab (select dropdown)

### Behavior
- Changes apply immediately
- Saved to database for persistence
- Falls back to system default if user preference unavailable

## Implementation Details

### Language Detection Priority
1. User's saved preference (database)
2. localStorage setting
3. Browser language
4. System default
5. English (final fallback)

### Translation Loading
- Async import of JSON files
- Client-side caching
- Graceful fallbacks for missing keys

### State Management
- React hooks for language state
- localStorage for immediate persistence
- Database sync for long-term storage

## Adding New Languages

### 1. Update Type Definitions
```typescript
// src/lib/i18n.ts
export type Locale = 'en' | 'fr' | 'es'; // Add new language
export const LOCALES = ['en', 'fr', 'es'] as const;
```

### 2. Add Translation File
Create `src/i18n/messages/es.json` with all translation keys.

### 3. Update Constants
```typescript
export const LOCALE_NAMES = {
  en: 'English',
  fr: 'Français',
  es: 'Español' // Add new language
} as const;

export const LOCALE_FLAGS = {
  en: '🇺🇸',
  fr: '🇫🇷', 
  es: '🇪🇸' // Add new language
} as const;
```

### 4. Update Database Models
Update enum values in both user preferences and system settings models.

## Translation Guidelines

### Key Naming Convention
- Use dot notation: `section.subsection.key`
- Keep keys descriptive: `dashboard.welcome` not `d.w`
- Group related keys: `auth.login`, `auth.register`

### Translation Best Practices
- Keep consistent tone across languages
- Consider cultural context
- Use parameter substitution for dynamic content
- Provide meaningful fallbacks

## Current Translation Coverage

### Completed Sections
- ✅ Common UI elements
- ✅ Navigation
- ✅ Dashboard (partial)
- ✅ Authentication
- ✅ Settings
- ✅ User management
- ✅ Payments

### Pending Sections
- ⏳ Calls & CDRs
- ⏳ Tickets/Support
- ⏳ Phone Numbers
- ⏳ Trunks
- ⏳ Rates

## Testing

### Build Status
- ✅ TypeScript compilation
- ✅ Next.js build
- ✅ Component rendering
- ✅ Translation loading

### Manual Testing Checklist
- [ ] Language switcher changes UI language
- [ ] User preferences persist after reload
- [ ] Admin can configure system settings
- [ ] Fallbacks work for missing translations
- [ ] Parameter substitution works correctly

## Deployment Notes

### Environment Variables
No additional environment variables required.

### Database Migration
Models will auto-create collections on first use with default settings.

### Backwards Compatibility
Fully backwards compatible - existing users will use English by default.

## Troubleshooting

### Common Issues
1. **Translations not loading**: Check JSON syntax in message files
2. **Language not persisting**: Verify API endpoints are working
3. **Fallback not working**: Ensure English translations exist for all keys
4. **Admin settings not saving**: Check user permissions

### Debug Mode
Add to component for debugging:
```jsx
const { locale, isLoading } = useTranslations();
console.log('Current locale:', locale, 'Loading:', isLoading);
``` 