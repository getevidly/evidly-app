import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    // TODO: Replace with your Sanity project ID after running `npx sanity init`
    projectId: 'YOUR_PROJECT_ID',
    dataset: 'production',
  },
})
