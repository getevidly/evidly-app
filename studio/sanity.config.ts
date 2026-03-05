import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'evidly-blog',
  title: 'EvidLY Blog',

  // TODO: Replace with your Sanity project ID after running `npx sanity init`
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
