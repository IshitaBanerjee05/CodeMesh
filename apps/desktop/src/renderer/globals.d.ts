import type { ClassroomApi, DesktopBridge } from './contracts';

declare global {
  interface Window {
    codeMeshDesktop?: DesktopBridge;
    codeMeshApi: ClassroomApi;
  }
}

export {};
