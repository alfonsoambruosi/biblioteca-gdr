import { Injectable, computed, effect, signal } from '@angular/core';
import { DEVICE_LABEL, DeviceKind, detectDevice } from './device';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  readonly kind = signal<DeviceKind>(detectDevice());
  readonly label = computed(() => DEVICE_LABEL[this.kind() as DeviceKind]);

  constructor() {
    // Mette il tipo di dispositivo sulla pagina (data-device="smartphone" | "tablet" | "pc")
    // così il foglio di stile può adattare il layout.
    effect(() => {
      document.documentElement.dataset['device'] = this.kind();
    });
  }
}
