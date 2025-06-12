# Push Notifications Setup Guide

## Overview
This guide covers the setup and deployment of the push notification system for the OVO application.

## Environment Variables Required

Add these variables to your `.env` file:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPpc5ppkbyT_tI7PJJDCvdmCC6YiaGz8Ih-oa48P9gkx7Vjq4fP2Yyndpr_e4xXthjIAg3TTsJOyeCZCEyAM73I
VAPID_PRIVATE_KEY=your_vapid_private_key_here

# Web Push Configuration
WEB_PUSH_CONTACT=mailto:your-email@domain.com
```

## VAPID Keys Generation

If you need to generate new VAPID keys:

```bash
npx web-push generate-vapid-keys
```

## Database Models

The system uses these MongoDB models:

### PushSubscription Model
- `userId`: String - User identifier
- `endpoint`: String - FCM/browser endpoint
- `subscriptionData`: Object - Full subscription data
- `isActive`: Boolean - Whether subscription is valid
- `createdAt`: Date
- `updatedAt`: Date

### NotificationPreferences Model
- `userId`: String - User identifier
- `enablePushNotifications`: Boolean - Global push setting
- `typePreferences`: Object - Per-notification-type settings
  - `[notificationType]`:
    - `enabled`: Boolean
    - `enablePush`: Boolean
    - `showToast`: Boolean
    - `priority`: String

## API Endpoints

### POST `/api/notifications/push-subscription`
- Saves user's push subscription
- Requires authentication
- Body: FCM subscription object

### POST `/api/notifications/enable-push-for-user`
- Enables push notifications for authenticated user
- Requires authentication
- No body required

### POST `/api/notifications`
- Creates notification and sends push if enabled
- Handles push notification logic internally
- Body: `{ userId, type, data }`

## Service Worker

The service worker (`/public/sw.js`) handles:
- Push event reception
- Notification display
- User interaction (click, close)
- Background sync

## Client-Side Integration

### Requesting Permission
```javascript
const { requestPushPermission } = useNotifications();
const granted = await requestPushPermission();
```

### Checking Status
```javascript
const { preferences } = useNotifications();
console.log('Push enabled:', preferences?.enablePushNotifications);
```

### Notification Settings Interface
Users can access comprehensive notification settings at:
- **URL**: `/settings/notifications`
- **Features**:
  - Global notification toggles (Toast, Sound, Push)
  - Sound volume and theme selection
  - Do Not Disturb scheduling
  - Per-notification-type preferences
  - Individual control over Toast/Sound/Push for each notification type
  - Priority settings per notification type
  - Test notification buttons

### Updating Preferences Programmatically
```javascript
const { updatePreferences } = useNotifications();

// Update global settings
await updatePreferences({
  enablePushNotifications: true,
  soundVolume: 0.8,
  doNotDisturbEnabled: true,
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '08:00'
});

// Update specific notification type
await updatePreferences({
  typePreferences: {
    ticket_created: {
      enabled: true,
      showToast: true,
      playSound: true,
      enablePush: true,
      priority: 'high'
    }
  }
});
```

## Production Deployment Checklist

### 1. Environment Setup
- [ ] Set VAPID keys in production environment
- [ ] Configure WEB_PUSH_CONTACT email
- [ ] Ensure MongoDB indexes are created

### 2. HTTPS Requirement
- [ ] Ensure application is served over HTTPS
- [ ] Push notifications require secure context

### 3. Domain Configuration
- [ ] Update VAPID public key if changing domains
- [ ] Test push notifications on production domain

### 4. Browser Compatibility
- [ ] Chrome: ✅ Supported
- [ ] Firefox: ✅ Supported  
- [ ] Safari: ✅ Supported (iOS 16.4+)
- [ ] Edge: ✅ Supported

### 5. Error Handling
- [ ] Invalid subscriptions are automatically marked inactive
- [ ] Graceful fallback when push fails
- [ ] Logging for production debugging

## User Instructions

### For End Users
1. Visit notification settings in the app
2. Click "Enable Push Notifications" 
3. Allow browser permission when prompted
4. Check OS notification settings if notifications don't appear

### OS-Specific Settings

#### macOS
- System Settings → Notifications & Focus
- Find your browser (Chrome/Firefox/Safari)
- Enable notifications and set to "Alerts" or "Banners"
- Disable "Do Not Disturb" mode

#### Windows
- Settings → System → Notifications
- Enable notifications for your browser
- Check individual app notification settings

#### iOS/Android
- Browser notifications follow system notification settings
- Check browser app notification permissions in device settings

## Testing

### Development Testing
```javascript
// Test basic notifications
window.testBasicNotification()

// Test service worker notifications  
window.testServiceWorkerNotification()
```

### Production Testing
1. Create test notification via API
2. Verify push notification appears
3. Test notification click handling
4. Verify proper cleanup of invalid subscriptions

## Monitoring

Monitor these metrics in production:
- Push notification success/failure rates
- Invalid subscription cleanup frequency
- User notification preference adoption
- Service worker registration success

## Security Notes

- VAPID keys should be kept secure
- Private key should never be exposed to client
- Subscriptions are tied to authenticated users
- Automatic cleanup of invalid/expired subscriptions

## Troubleshooting

### Common Issues
1. **No notifications appearing**: Check OS/browser notification settings
2. **Invalid subscription errors**: Subscriptions automatically marked inactive
3. **VAPID key errors**: Verify environment variables are set correctly
4. **HTTPS errors**: Ensure secure context for service worker registration

### Debug Steps
1. Check browser console for errors
2. Verify service worker registration
3. Test notification permission status
4. Check network requests for push subscription saving 