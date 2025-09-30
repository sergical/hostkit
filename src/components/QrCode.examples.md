# QR Code Component - Usage Examples

The `QrCodeDisplay` component provides an easy way to generate QR codes for sharing links within your application.

## Installation

Already installed via the migration from print-your-prompt-demo:
```bash
npm install react-qr-code
```

## Basic Usage

### Simple QR Code (current page)
```tsx
import { QrCodeDisplay } from '@/components/QrCode'

<QrCodeDisplay />
```

### QR Code to specific route
```tsx
<QrCodeDisplay to="/dashboard" />
```

### QR Code to external URL
```tsx
<QrCodeDisplay to="https://example.com" />
```

## Advanced Usage

### Custom Size
```tsx
<QrCodeDisplay 
  to="/dashboard" 
  size={300}  // Default is 256px
/>
```

### With WiFi Network Info
Perfect for events or shared spaces:
```tsx
<QrCodeDisplay 
  to="/poll" 
  showNetworkInfo={true}
  networkName="Event-WiFi"
  networkPassword="welcome123"
  size={220}
/>
```

### Custom Styling
```tsx
<QrCodeDisplay 
  to="/sign-up" 
  className="shadow-lg border-2 border-primary"
  size={200}
/>
```

### Custom Loading State
```tsx
<QrCodeDisplay 
  to="/dashboard"
  loadingFallback={
    <div className="flex items-center justify-center h-64 w-64">
      <Spinner />
    </div>
  }
/>
```

## Real-World Examples

### Modal/Dialog Share
```tsx
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { QrCodeDisplay } from '@/components/QrCode'

function ShareDialog({ open, onClose, route }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h3>Share this page</h3>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <QrCodeDisplay to={route} size={250} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Card Layout
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCodeDisplay } from '@/components/QrCode'

function ShareCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Session</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground text-center">
          Scan to participate
        </p>
        <QrCodeDisplay to="/poll" size={180} />
      </CardContent>
    </Card>
  )
}
```

### With Dynamic Routes
```tsx
import { QrCodeDisplay } from '@/components/QrCode'

function EventPage({ eventId }: { eventId: string }) {
  return (
    <div>
      <h1>Event {eventId}</h1>
      <QrCodeDisplay 
        to={`/events/${eventId}`} 
        size={200}
      />
    </div>
  )
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `string` | `'/'` | Path or URL to encode. Paths starting with '/' are appended to origin |
| `size` | `number` | `256` | Size of QR code in pixels |
| `className` | `string` | `''` | Additional CSS classes for container |
| `showNetworkInfo` | `boolean` | `false` | Show WiFi credentials below QR code |
| `networkName` | `string` | `'iPhone-Hotspot'` | WiFi network name |
| `networkPassword` | `string` | `'demopass'` | WiFi network password |
| `loadingFallback` | `ReactNode` | skeleton | Custom loading component |

## Migration Notes from print-your-prompt-demo

### Key Changes:
1. **Made `to` prop flexible** - was hardcoded to `/poll`, now accepts any route
2. **Added external URL support** - can now use full URLs, not just internal paths
3. **Improved TypeScript** - better prop types and documentation
4. **Better defaults** - sensible fallbacks for all optional props
5. **Custom loading** - ability to customize loading skeleton

### Differences:
- Uses TanStack Router instead of Next.js (but component is framework-agnostic)
- More composable with `cn()` utility for class merging
- Added JSDoc comments for better IDE support
