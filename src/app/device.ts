export type DeviceKind = 'smartphone' | 'tablet' | 'pc';

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  pc: 'PC / notebook',
};

/**
 * Riconosce il tipo di dispositivo dal browser e, se serve, dalle dimensioni dello schermo.
 * È una stima: alcuni browser nascondono le informazioni, quindi può sbagliare.
 */
export function detectDevice(
  nav: { userAgent: string; maxTouchPoints?: number } = navigator,
  screenSize: { width: number; height: number } = { width: screen.width, height: screen.height }
): DeviceKind {
  const ua = nav.userAgent || '';
  const touch = (nav.maxTouchPoints ?? 0) > 1;
  const shortSide = Math.min(screenSize.width, screenSize.height);

  // tablet dichiarati nello user agent
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return 'tablet';
  // iPadOS si presenta come Mac: è un tablet se ha lo schermo tattile
  if (/Macintosh/i.test(ua) && touch) return 'tablet';
  // Android: con la parola "Mobile" è un telefono, senza è un tablet
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'smartphone' : 'tablet';
  // telefoni dichiarati nello user agent
  if (/iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua)) return 'smartphone';

  // nessun riconoscimento dal browser: decide lo schermo, solo se è tattile
  if (touch) {
    if (shortSide < 600) return 'smartphone';
    if (shortSide < 1100) return 'tablet';
  }
  return 'pc';
}
