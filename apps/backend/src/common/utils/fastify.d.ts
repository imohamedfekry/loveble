// This empty export makes the file a "module" so that
// `declare module 'fastify'` below is treated as MODULE AUGMENTATION
// (merging with real Fastify types), NOT as a standalone ambient declaration
// that would replace the original types.
export {};

declare module 'fastify' {
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: import('@fastify/cookie').CookieSerializeOptions,
    ): this;
    clearCookie(
      name: string,
      options?: import('@fastify/cookie').CookieSerializeOptions,
    ): this;
  }

  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
  }
}
