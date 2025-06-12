# Advanced Internal Notification System

This document describes the comprehensive internal notification system implemented for the OVO application. The system provides real-time in-app notifications with sound effects, browser push notifications, and sophisticated user preference management.

## 🚀 Features

### Core Functionality
- **Real-time In-App Notifications**: Toast notifications with customizable positioning and duration
- **Sound System**: Audio notifications with different sound themes and volume control
- **Browser Push Notifications**: Native browser notifications with action buttons
- **Notification Center**: Slide-out panel with filtering, search, and management capabilities
- **User Preferences**: Granular control over notification types, sounds, and delivery methods
- **Do Not Disturb**: Time-based notification silencing
- **Email Fallback**: Integration with existing email notification system

### Advanced Features
- **Priority-based Notifications**: Low, medium, high, and urgent priority levels
- **Notification Templates**: Pre-defined templates for different notification types
- **Filtering & Search**: Advanced filtering by type, priority, status, and date range
- **Notification Actions**: Mark as read, archive, delete, and bulk operations
- **Real-time Updates**: Polling-based updates with optimistic UI updates
- **Responsive Design**: Mobile-friendly notification center and components
- **Accessibility**: Screen reader support and keyboard navigation

## 📁 File Structure

```
src/
├── types/notifications.ts              # TypeScript type definitions
├── models/InternalNotification.ts      # MongoDB models
├── services/
│   ├── InternalNotificationService.ts  # Core notification service
│   └── NotificationSoundService.ts     # Audio management service
├── contexts/NotificationContext.tsx    # React context provider
├── components/notifications/
│   ├── NotificationBell.tsx           # Bell icon with badge
│   └── NotificationCenter.tsx         # Slide-out notification panel
├── app/api/notifications/
│   ├── route.ts                       # Main notifications API
│   └── preferences/route.ts           # User preferences API
└── components/ui/scroll-area.tsx      # Scroll area component

public/
└── sw.js                              # Service worker for push notifications
```

## 🛠️ Setup & Installation

### 1. Database Models
The system uses MongoDB with Mongoose for data persistence. Two main collections are created:
- `InternalNotification`: Stores individual notifications
- `NotificationPreferences`: Stores user notification preferences

### 2. Environment Variables
Add these environment variables to your `.env` file:

```env
# Push Notifications (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### 3. Service Worker Registration
The service worker is automatically registered for push notifications. Ensure `public/sw.js` is accessible.

### 4. Context Provider Setup
Wrap your application with the NotificationProvider:

```tsx
import { NotificationProvider } from '@/contexts/NotificationContext';

function App({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
```

## 🎯 Usage

### Basic Notification Creation

```tsx
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleCreateNotification = async () => {
    await addNotification({
      userId: 'user123',
      type: 'ticket_created',
      title: 'New Support Ticket',
      message: 'Ticket #12345 has been created',
      priority: 'medium',
      status: 'unread',
      data: { ticketNumber: '12345' },
      actionUrl: '/tickets/12345'
    });
  };

  return (
    <button onClick={handleCreateNotification}>
      Create Notification
    </button>
  );
}
```

### Adding Notification Bell

```tsx
import { NotificationBell } from '@/components/notifications/NotificationBell';

function Header() {
  return (
    <div className="header">
      <NotificationBell size="md" animated={true} />
    </div>
  );
}
```

### Adding Notification Center

```tsx
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

function Layout({ children }) {
  return (
    <div>
      {children}
      <NotificationCenter />
    </div>
  );
}
```

## 🔧 API Endpoints

### GET /api/notifications
Retrieve user notifications with filtering options.

**Query Parameters:**
- `userId` (required): User ID
- `limit`: Number of notifications to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `search`: Search query for title/message
- `types`: Comma-separated notification types
- `statuses`: Comma-separated status values
- `priorities`: Comma-separated priority levels

**Response:**
```json
{
  "notifications": [...],
  "total": 25
}
```

### POST /api/notifications
Create a new notification.

**Request Body:**
```json
{
  "userId": "user123",
  "type": "ticket_created",
  "data": {
    "ticketNumber": "12345",
    "priority": "high"
  }
}
```

### GET /api/notifications/preferences
Get user notification preferences.

### PUT /api/notifications/preferences
Update user notification preferences.

## 🎵 Sound System

The notification system includes a sophisticated audio management system:

### Sound Types
- `default`: Standard notification sound
- `subtle`: Quiet, non-intrusive sound
- `success`: Positive action sound
- `warning`: Attention-grabbing sound
- `error`: Alert sound for errors
- `urgent`: High-priority alert sound
- `ticket`: Ticket-specific sound
- `payment`: Payment-related sound
- `none`: Silent notifications

### Audio Features
- **Volume Control**: Adjustable volume (0-1)
- **Synthetic Fallback**: Generated sounds if audio files aren't available
- **Browser Compatibility**: Works across modern browsers
- **Permission Handling**: Automatic audio permission requests

## 📱 Push Notifications

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited support (iOS 16.4+)

### Features
- **Action Buttons**: View and dismiss actions
- **Rich Content**: Icons, badges, and custom data
- **Click Handling**: Automatic navigation to relevant pages
- **Offline Support**: Background sync when connection restored

### Setup Push Notifications

1. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

2. Add keys to environment variables

3. Request permission:
```tsx
const { requestPushPermission } = useNotifications();
const granted = await requestPushPermission();
```

## 🎨 Notification Types

The system supports 20 different notification types:

### Ticket Notifications
- `ticket_created`: New support ticket
- `ticket_updated`: Ticket status change
- `ticket_assigned`: Ticket assignment
- `ticket_reply`: New ticket reply
- `ticket_resolved`: Ticket resolution

### Payment Notifications
- `payment_success`: Successful payment
- `payment_failed`: Failed payment
- `low_balance`: Low account balance
- `zero_balance`: Zero account balance

### Phone Number Notifications
- `phone_number_approved`: Number request approved
- `phone_number_rejected`: Number request rejected
- `phone_number_purchased`: Number purchased
- `phone_number_assigned`: Number assigned

### System Notifications
- `system_maintenance`: Maintenance alerts
- `user_verification`: Account verification
- `admin_alert`: Administrative alerts
- `rate_deck_updated`: Rate changes
- `call_quality_alert`: Quality issues
- `security_alert`: Security concerns

## ⚙️ User Preferences

Users can customize their notification experience:

### Global Settings
- **Toast Notifications**: Enable/disable toast notifications
- **Toast Duration**: 1-30 seconds
- **Toast Position**: 6 different positions
- **Sound Notifications**: Enable/disable sounds
- **Sound Volume**: 0-100%
- **Sound Theme**: Different sound sets
- **Push Notifications**: Enable/disable browser push
- **Push When Away**: Only send push when tab inactive

### Per-Type Settings
For each notification type, users can control:
- **Enabled**: Whether to receive this type
- **Show Toast**: Display toast notification
- **Play Sound**: Play audio notification
- **Enable Push**: Send browser push notification
- **Priority**: Override default priority

### Do Not Disturb
- **Time-based Silencing**: Set quiet hours
- **Spans Midnight**: Support for overnight periods
- **Automatic Detection**: Respects system DND settings

## 🔄 Integration with Existing Systems

### Email Notification Integration
The system integrates with the existing email notification service:

```tsx
// In your existing email service
import InternalNotificationService from '@/services/InternalNotificationService';

const notificationService = InternalNotificationService.getInstance();

// After sending email notification
await notificationService.onEmailNotificationSent(
  userId,
  'low_balance',
  { balance: 10.50, currency: 'USD' }
);
```

### Ticket System Integration
```tsx
// When ticket events occur
await notificationService.onTicketEvent(
  'created',
  { ticketNumber: '12345', status: 'open', priority: 'high' },
  userId
);
```

### Payment System Integration
```tsx
// When payments are processed
await notificationService.onPaymentEvent(
  'success',
  { amount: 100, currency: 'USD', paymentId: 'pay_123' },
  userId
);
```

## 🎭 Customization

### Custom Notification Types
Add new notification types by extending the `NotificationType` union:

```tsx
// In types/notifications.ts
export type NotificationType = 
  | 'existing_types'
  | 'custom_notification_type';

// Add template
export const NotificationTemplates = {
  // ... existing templates
  custom_notification_type: {
    icon: '🔔',
    sound: 'default',
    color: 'bg-blue-500',
    getTitle: () => 'Custom Notification',
    getMessage: (data) => `Custom message: ${data?.message}`
  }
};
```

### Custom Sounds
Add custom audio files to the sound service:

```tsx
const soundService = NotificationSoundService.getInstance();
await soundService.addCustomSound('custom', audioBuffer);
```

### Styling
The notification components use Tailwind CSS and can be customized:

```tsx
<NotificationBell 
  className="custom-bell-styles"
  size="lg"
  animated={true}
/>
```

## 🔍 Debugging

### Enable Debug Logging
```tsx
// In browser console
localStorage.setItem('debug-notifications', 'true');
```

### Common Issues

1. **Sounds Not Playing**: Check browser autoplay policies
2. **Push Not Working**: Verify VAPID keys and HTTPS
3. **Notifications Not Appearing**: Check user preferences
4. **Database Errors**: Verify MongoDB connection

### Testing Notifications
```tsx
const { testNotification } = useNotifications();
await testNotification('ticket_created');
```

## 📊 Performance Considerations

### Optimization Features
- **Polling Optimization**: Only polls when tab is active
- **Batch Updates**: Groups multiple notifications
- **Memory Management**: Automatic cleanup of old notifications
- **Lazy Loading**: Components load on demand
- **Debounced Filtering**: Prevents excessive API calls

### Database Indexes
The system includes optimized MongoDB indexes:
- User + creation date
- User + status + creation date
- User + type + creation date
- User + priority + creation date
- TTL index for automatic cleanup

## 🚀 Future Enhancements

### Planned Features
- **WebSocket Integration**: Real-time notifications without polling
- **Rich Media**: Image and video support in notifications
- **Notification Scheduling**: Delayed and recurring notifications
- **Analytics**: Notification engagement tracking
- **A/B Testing**: Different notification strategies
- **Mobile App Integration**: React Native support
- **Notification Templates**: Visual template editor
- **Workflow Integration**: Zapier/webhook support

### Performance Improvements
- **Virtual Scrolling**: Handle thousands of notifications
- **Service Worker Caching**: Offline notification support
- **Background Sync**: Queue notifications when offline
- **Push Notification Server**: Dedicated push service

## 📝 License

This notification system is part of the OVO application and follows the same licensing terms.

## 🤝 Contributing

When contributing to the notification system:

1. **Follow TypeScript**: Maintain strict type safety
2. **Test Thoroughly**: Test across different browsers
3. **Document Changes**: Update this README
4. **Performance**: Consider impact on app performance
5. **Accessibility**: Ensure screen reader compatibility

## 📞 Support

For issues with the notification system:

1. Check the debugging section above
2. Review browser console for errors
3. Verify database connectivity
4. Test with different notification types
5. Check user preferences configuration

---

This notification system provides a comprehensive, user-friendly way to keep users informed about important events in the OVO application while respecting their preferences and providing a smooth user experience. 