// Dev-only logging. No-ops in production builds to keep the console clean.
export const devLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};