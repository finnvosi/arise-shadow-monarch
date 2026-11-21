import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Attempts to immediately lock the screen orientation to LANDSCAPE.
 * Works across Native (iOS/Android) and Web (PWA / Screen Orientation API).
 */
export async function lockToLandscape(): Promise<void> {
  // 1. Native Expo ScreenOrientation lock
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (err) {
    // Unsupported or restricted on current device/environment
  }

  // 2. Web Screen Orientation API (Android Chrome, Edge, PWA standalone)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const scr = window.screen as any;
      if (scr?.orientation?.lock) {
        await scr.orientation.lock('landscape');
      } else if (scr?.lockOrientation) {
        scr.lockOrientation('landscape');
      } else if (scr?.mozLockOrientation) {
        scr.mozLockOrientation('landscape');
      } else if (scr?.msLockOrientation) {
        scr.msLockOrientation('landscape');
      }
    } catch (err) {
      // Browser may require fullscreen or user gesture
    }
  }
}

/**
 * Request fullscreen and lock orientation to landscape.
 * On mobile browsers (like Chrome on Android), screen.orientation.lock()
 * is allowed once in fullscreen mode.
 */
export async function requestFullscreenLandscape(): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const docEl = document.documentElement as any;
      const rfs =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (rfs && !document.fullscreenElement) {
        await rfs.call(docEl);
      }
    } catch (err) {
      // Fullscreen not permitted or cancelled
    }
  }

  await lockToLandscape();
}
