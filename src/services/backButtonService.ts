import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { NavigateFunction } from 'react-router-dom';

type DismissHandler = () => boolean;

class BackButtonService {
  private modalStack: DismissHandler[] = [];
  private historyStack: string[] = ['/'];
  private navigateRef: NavigateFunction | null = null;
  private isRegistered = false;
  private lastBackPressTime = 0;

  /**
   * Register a modal or overlay dismiss handler.
   * Returns a cleanup function to unregister when modal closes/unmounts.
   */
  public registerModal(handler: DismissHandler): () => void {
    this.modalStack.push(handler);
    return () => {
      this.unregisterModal(handler);
    };
  }

  public unregisterModal(handler: DismissHandler): void {
    const idx = this.modalStack.lastIndexOf(handler);
    if (idx !== -1) {
      this.modalStack.splice(idx, 1);
    }
  }

  /**
   * Update the router navigation reference and track history path.
   */
  public setNavigate(navigate: NavigateFunction): void {
    this.navigateRef = navigate;
  }

  public trackPath(pathname: string): void {
    const current = this.historyStack[this.historyStack.length - 1];
    if (current !== pathname) {
      this.historyStack.push(pathname);
    }
  }

  /**
   * Initialize native back button listener once.
   */
  public init(): () => void {
    if (this.isRegistered || !Capacitor.isNativePlatform()) {
      return () => {};
    }

    this.isRegistered = true;

    const listenerPromise = CapacitorApp.addListener('backButton', async () => {
      // 1. If software keyboard is active, dismiss it first
      try {
        await Keyboard.hide();
      } catch {
        // Keyboard plugin might not be available or keyboard not shown
      }

      // 2. If any modal / sheet / dialog / overlay is open, dismiss the topmost one
      if (this.modalStack.length > 0) {
        const topHandler = this.modalStack.pop();
        if (topHandler) {
          const handled = topHandler();
          if (handled) {
            return;
          }
        }
      }

      // 3. Handle Route Navigation
      const currentPath = this.historyStack[this.historyStack.length - 1] || '/';

      // Check if we are at the root home screen
      const isRoot = currentPath === '/' || currentPath === '/home';

      if (!isRoot && this.navigateRef) {
        // Pop current path from stack and navigate back
        this.historyStack.pop();
        this.navigateRef(-1);
        return;
      }

      // 4. If at root screen, standard Android behavior: exit app
      const now = Date.now();
      if (now - this.lastBackPressTime < 2000) {
        CapacitorApp.exitApp();
      } else {
        this.lastBackPressTime = now;
        // Optionally show brief toast or exit directly if single press is desired
        CapacitorApp.exitApp();
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
      this.isRegistered = false;
    };
  }
}

export const backButtonService = new BackButtonService();

