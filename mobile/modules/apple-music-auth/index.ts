// Reexport the native module. On web, it will be resolved to AppleMusicAuthModule.web.ts
// and on native platforms to AppleMusicAuthModule.ts
export { default } from './src/AppleMusicAuthModule';
export { default as AppleMusicAuthView } from './src/AppleMusicAuthView';
export * from  './src/AppleMusicAuth.types';
