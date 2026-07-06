// Maps KeenIcon classes to Expo vector icons (Ionicons or similar)
export const mapKeenIconToIonicons = (keenIconClass: string): any => {
  if (!keenIconClass) return 'cube-outline';

  // Common mappings
  if (keenIconClass.includes('ki-keyboard')) return 'desktop-outline';
  if (keenIconClass.includes('ki-wrench')) return 'build-outline';
  if (keenIconClass.includes('ki-calendar')) return 'calendar-outline';
  if (keenIconClass.includes('ki-cube')) return 'cube-outline';
  if (keenIconClass.includes('ki-delivery')) return 'cart-outline';
  if (keenIconClass.includes('ki-document')) return 'document-text-outline';
  if (keenIconClass.includes('ki-parcel')) return 'file-tray-stacked-outline';
  if (keenIconClass.includes('ki-graph-up')) return 'bar-chart-outline';
  if (keenIconClass.includes('ki-screen')) return 'tv-outline';
  if (keenIconClass.includes('ki-handcart')) return 'bag-handle-outline';
  if (keenIconClass.includes('ki-notification-on')) return 'notifications-outline';
  if (keenIconClass.includes('ki-send')) return 'paper-plane-outline';
  if (keenIconClass.includes('ki-truck')) return 'bus-outline';
  if (keenIconClass.includes('ki-sms')) return 'chatbubble-ellipses-outline';
  if (keenIconClass.includes('ki-book')) return 'book-outline';
  if (keenIconClass.includes('ki-ranking')) return 'podium-outline';
  if (keenIconClass.includes('ki-flask')) return 'flask-outline';
  if (keenIconClass.includes('ki-car')) return 'car-outline';
  if (keenIconClass.includes('ki-tag')) return 'pricetag-outline';
  if (keenIconClass.includes('ki-abstract-6')) return 'bulb-outline';
  if (keenIconClass.includes('ki-element-equal')) return 'git-network-outline';
  if (keenIconClass.includes('ki-people')) return 'people-outline';

  // Default fallback
  return 'grid-outline';
};
