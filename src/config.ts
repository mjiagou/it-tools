import { figue } from 'figue';

const environment = {
  ...import.meta.env,
  PACKAGE_VERSION: import.meta.env.PACKAGE_VERSION,
  VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV ?? import.meta.env.CF_PAGES_ENV ?? import.meta.env.MODE,
  VITE_VERCEL_GIT_COMMIT_SHA: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ?? import.meta.env.CF_PAGES_COMMIT_SHA,
};

export const config = figue({
  app: {
    version: {
      doc: 'Application current version',
      format: 'string',
      default: '0.0.0',
      env: 'PACKAGE_VERSION',
    },
    lastCommitSha: {
      doc: 'Application last commit SHA version',
      format: 'string',
      default: '',
      env: 'VITE_VERCEL_GIT_COMMIT_SHA',
    },
    baseUrl: {
      doc: 'Application base url',
      format: 'string',
      default: '/',
      env: 'BASE_URL',
    },
    env: {
      doc: 'Application current env',
      format: 'enum',
      values: ['production', 'development', 'preview', 'test'],
      default: import.meta.env.MODE ?? 'development',
      env: 'VITE_VERCEL_ENV',
    },
  },
  plausible: {
    isTrackerEnabled: {
      doc: 'Is the tracker enabled',
      format: 'boolean',
      default: false,
      env: 'VITE_TRACKER_ENABLED',
    },
    domain: {
      doc: 'Plausible current domain',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_DOMAIN',
    },
    apiHost: {
      doc: 'Plausible remote api host',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_API_HOST',
    },
    trackLocalhost: {
      doc: 'Enable or disable localhost tracking by plausible',
      format: 'boolean',
      default: false,
    },
  },
  showBanner: {
    doc: 'Show the banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_BANNER',
  },
  showSponsorBanner: {
    doc: 'Show the sponsor banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_SPONSOR_BANNER',
  },
})
  .loadEnv(environment)
  .validate()
  .getConfig();
