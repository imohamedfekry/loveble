/**
 * `lovable.conf` — a tiny, human-editable project manifest written by the agent.
 *
 *   start: npm run dev -- --host 0.0.0.0 --port 3000
 *   install: npm install
 *
 * `start` is the command that serves the app on the preview port; `install`
 * (optional) prepares dependencies before it runs. Keeping this in the project
 * files means the preview can be started without the AI being involved.
 */

export const LOVABLE_CONF_PATH = 'lovable.conf';

export interface LovableConfig {
  start?: string;
  install?: string;
  build?: string;
}

/** Parse the flat `key: value` manifest (comments and blank lines ignored). */
export function parseLovableConfig(raw: string | undefined): LovableConfig {
  const config: LovableConfig = {};
  if (!raw) return config;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;

    const key = trimmed.slice(0, colon).trim().toLowerCase();
    let value = trimmed.slice(colon + 1).trim();
    if (!value) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === 'start' || key === 'install' || key === 'build') {
      config[key] = value;
    }
  }

  return config;
}

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function parsePackageJson(raw: string | undefined): PackageJson | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PackageJson;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the commands used to prepare and serve the project.
 *
 * `lovable.conf` wins. When it is missing we fall back to the conventional
 * scripts a framework generates, so older projects keep previewing while the
 * agent learns to write the manifest.
 */
export function resolvePreviewCommands(
  config: LovableConfig,
  packageJsonRaw: string | undefined,
  port: number,
): { start?: string; install?: string } {
  const pkg = parsePackageJson(packageJsonRaw);
  const deps = {
    ...pkg?.dependencies,
    ...pkg?.devDependencies,
    ...pkg?.peerDependencies,
  };
  const scripts = pkg?.scripts ?? {};

  let start = config.start;
  if (!start) {
    if (deps['vite'] && scripts['dev']) {
      start = `npm run dev -- --host 0.0.0.0 --port ${port} --strictPort`;
    } else if (deps['next'] && scripts['dev']) {
      start = `npm run dev -- -H 0.0.0.0 -p ${port}`;
    } else if (scripts['dev']) {
      start = 'npm run dev';
    } else if (scripts['start']) {
      start = 'npm start';
    }
  }

  const install =
    config.install ?? (pkg ? 'npm install --no-audit --no-fund' : undefined);

  return { start, install };
}
