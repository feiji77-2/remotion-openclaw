// P4: 全局类型扩展 — tools:studio 自定义端口
declare global {
  interface Window {
    __VIDEO_FACTORY_PORT__?: number;
  }
}

export {};
