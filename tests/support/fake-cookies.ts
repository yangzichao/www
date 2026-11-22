import type { AstroCookies, AstroCookieSetOptions } from 'astro';

export interface CookieWrite {
  name: string;
  value: string;
  options: AstroCookieSetOptions | undefined;
}

class FakeCookieValue {
  constructor(readonly value: string) {}

  json(): unknown {
    return JSON.parse(this.value);
  }

  number(): number {
    return Number(this.value);
  }

  boolean(): boolean {
    return this.value === 'true';
  }
}

export class FakeCookieJar {
  readonly writes: CookieWrite[] = [];
  readonly deletions: string[] = [];
  private readonly values = new Map<string, string>();

  constructor(initialValues: Record<string, string> = {}) {
    for (const [name, value] of Object.entries(initialValues)) this.values.set(name, value);
  }

  valueOf(name: string): string | undefined {
    return this.values.get(name);
  }

  asAstroCookies(): AstroCookies {
    const cookies: Pick<AstroCookies, 'get' | 'has' | 'set' | 'delete'> = {
      get: (name) => {
        const value = this.values.get(name);
        if (value === undefined) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment -- External: astro does not export the AstroCookie class, and it holds no private state.
        return new FakeCookieValue(value);
      },
      has: (name) => this.values.has(name),
      set: (name, value, options) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        this.values.set(name, serialized);
        this.writes.push({ name, value: serialized, options });
      },
      delete: (name) => {
        this.values.delete(name);
        this.deletions.push(name);
      },
    };
    return cookies as AstroCookies;
  }
}
