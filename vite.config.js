import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
const isUserOrOrganizationSite = repository && owner && repository === `${owner}.github.io`;
const base = process.env.GITHUB_ACTIONS === 'true' && repository && !isUserOrOrganizationSite
  ? `/${repository}/`
  : '/';

export default defineConfig({
  base,
  plugins: [react()]
});
