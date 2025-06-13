// Simple client-side i18n system
import { useState, useEffect } from 'react';

export type Locale = 'en' | 'fr';

export const LOCALES = ['en', 'fr'] as const;

export const LOCALE_NAMES = {
  en: 'English',
  fr: 'Français'
} as const;

export const LOCALE_FLAGS = {
  en: '🇺🇸',
  fr: '🇫🇷'
} as const;

// Translation messages
let messages: Record<Locale, any> = {
  en: {},
  fr: {}
};

// Load messages asynchronously from split files
const loadMessages = async () => {
  try {
    // Load all translation modules for each language
    const [
      // English modules
      enCommon,
      enAuth,
      enOnboarding,
      enDashboard,
      enCalls,
      enCdrs,
      enPhoneNumbers,
      // French modules  
      frCommon,
      frAuth,
      frOnboarding,
      frDashboard,
      frCalls,
      frCdrs,
      frPhoneNumbers
    ] = await Promise.all([
      // English
      import('../i18n/messages/en/common.json'),
      import('../i18n/messages/en/auth.json'),
      import('../i18n/messages/en/onboarding.json'),
      import('../i18n/messages/en/dashboard.json'),
      import('../i18n/messages/en/calls.json'),
      import('../i18n/messages/en/cdrs.json'),
      import('../i18n/messages/en/phoneNumbers.json'),
      // French
      import('../i18n/messages/fr/common.json'),
      import('../i18n/messages/fr/auth.json'),
      import('../i18n/messages/fr/onboarding.json'),
      import('../i18n/messages/fr/dashboard.json'),
      import('../i18n/messages/fr/calls.json'),
      import('../i18n/messages/fr/cdrs.json'),
      import('../i18n/messages/fr/phoneNumbers.json')
    ]);
    
    // Merge English translations
    messages.en = {
      common: enCommon.default,
      auth: enAuth.default,
      onboarding: enOnboarding.default,
      dashboard: enDashboard.default,
      calls: enCalls.default,
      cdrs: enCdrs.default,
      phoneNumbers: enPhoneNumbers.default,
      // Keep existing translations from the old single file for backwards compatibility
      navigation: {
        dashboard: "Dashboard",
        calls: "Calls",
        cdrs: "Call History",
        tickets: "Tickets",
        users: "Users",
        settings: "Settings",
        rates: "Rates",
        payments: "Payments",
        trunks: "Trunks",
        services: "Services",
        logout: "Logout",
        account: "Account",
        admin: "Admin"
      },
      settings: {
        title: "Settings",
        description: "Configure system settings and integrations",
        general: "General",
        language: "Language",
        defaultLanguage: "Default Language",
        selectLanguage: "Select Language",
        languageDescription: "Choose the default language for the application",
        userLanguage: "Personal Language",
        userLanguageDescription: "Your personal language preference",
        notifications: "Notifications",
        branding: "Branding",
        smtp: "SMTP",
        scheduler: "Scheduler",
        sippy: "Sippy API"
      },
      users: {
        title: "Users",
        searchPlaceholder: "Search by name, email, or company...",
        addUser: "Add User",
        editUser: "Edit User",
        userDetails: "User Details",
        role: "Role",
        admin: "Administrator",
        client: "Client",
        verified: "Verified",
        suspended: "Suspended",
        active: "Active"
      },
      payments: {
        title: "Payments",
        topUp: "Top Up",
        topUpBalance: "Top Up Balance",
        paymentHistory: "Payment History",
        manageBalance: "Manage Balance"
      },
      language: {
        english: "English",
        french: "Français"
      }
    };
    
    // Merge French translations
    messages.fr = {
      common: frCommon.default,
      auth: frAuth.default,
      onboarding: frOnboarding.default,
      dashboard: frDashboard.default,
      calls: frCalls.default,
      cdrs: frCdrs.default,
      phoneNumbers: frPhoneNumbers.default,
      // Keep existing translations
      navigation: {
        dashboard: "Tableau de bord",
        calls: "Appels",
        cdrs: "Historique d'appels",
        tickets: "Tickets",
        users: "Utilisateurs",
        settings: "Paramètres",
        rates: "Tarifs",
        payments: "Paiements",
        trunks: "Trunks",
        services: "Services",
        logout: "Déconnexion",
        account: "Compte",
        admin: "Admin"
      },
      settings: {
        title: "Paramètres",
        description: "Configurer les paramètres système et les intégrations",
        general: "Général",
        language: "Langue",
        defaultLanguage: "Langue par défaut",
        selectLanguage: "Sélectionner la langue",
        languageDescription: "Choisir la langue par défaut pour l'application",
        userLanguage: "Langue personnelle",
        userLanguageDescription: "Votre préférence de langue personnelle",
        notifications: "Notifications",
        branding: "Image de marque",
        smtp: "SMTP",
        scheduler: "Planificateur",
        sippy: "API Sippy"
      },
      users: {
        title: "Utilisateurs",
        searchPlaceholder: "Rechercher par nom, e-mail ou entreprise...",
        addUser: "Ajouter un utilisateur",
        editUser: "Modifier l'utilisateur",
        userDetails: "Détails de l'utilisateur",
        role: "Rôle",
        admin: "Administrateur",
        client: "Client",
        verified: "Vérifié",
        suspended: "Suspendu",
        active: "Actif"
      },
      payments: {
        title: "Paiements",
        topUp: "Recharger",
        topUpBalance: "Recharger le solde",
        paymentHistory: "Historique des paiements",
        manageBalance: "Gérer le solde"
      },
      language: {
        english: "English",
        french: "Français"
      }
    };
  } catch (error) {
    console.error('Failed to load translation messages:', error);
  }
};

// Load messages immediately
loadMessages();

// Get the user's preferred language
export const getUserLanguage = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  
  // Check localStorage first
  const saved = localStorage.getItem('preferredLanguage') as Locale;
  if (saved && LOCALES.includes(saved)) {
    return saved;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split('-')[0] as Locale;
  return LOCALES.includes(browserLang) ? browserLang : 'en';
};

// Set the user's preferred language
export const setUserLanguage = (locale: Locale) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferredLanguage', locale);
};

// Simple translation function
export const t = (key: string, locale: Locale = getUserLanguage(), params?: Record<string, string>): string => {
  const keys = key.split('.');
  let value: any = messages[locale];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value !== 'string') {
    // Fallback to English if key not found
    if (locale !== 'en') {
      return t(key, 'en', params);
    }
    return key; // Return key if not found in any language
  }
  
  // Replace parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
      return params[paramKey] || match;
    });
  }
  
  return value;
};

// React hook for translations
export const useTranslations = () => {
  const [locale, setLocale] = useState<Locale>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set initial locale from localStorage/browser
    const initialLocale = getUserLanguage();
    setLocale(initialLocale);
    setIsLoading(false);
  }, []);

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setUserLanguage(newLocale);
  };

  const translate = (key: string, params?: Record<string, string>): string => {
    return t(key, locale, params);
  };

  return {
    locale,
    setLocale: changeLocale,
    t: translate,
    isLoading
  };
}; 