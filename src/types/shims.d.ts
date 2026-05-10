declare module 'uuid' {
  export function v4(): string;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
