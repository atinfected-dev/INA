import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Generates TypeScript types from the committed Warcraft Logs schema.
 *
 * The schema comes from `pnpm wcl:introspect` (a live introspection), never
 * from hand-written assumptions. Every operation below is validated against it,
 * so a query referencing a field that does not exist fails codegen — and
 * therefore the build — instead of failing in production.
 *
 * Operations live in src/operations.ts as `graphql(...)` template literals
 * rather than .graphql files. That is what the client preset expects, and the
 * preset is the only configuration that does not end up declaring the schema's
 * enums twice (the plain typescript + typescript-operations combination emits
 * every enum an operation references a second time, which collides).
 */
const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['src/**/*.ts', '!src/generated/**'],
  ignoreNoDocuments: false,
  generates: {
    './src/generated/': {
      preset: 'client',
      presetConfig: {
        // No fragment masking: this is a server-side data importer, not a
        // component tree, so masking would only add ceremony.
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        skipTypename: true,
        // Warcraft Logs returns untyped JSON for table()/rankings(); `unknown`
        // forces the importer to validate the shape instead of trusting it.
        scalars: { JSON: 'unknown' },
      },
    },
  },
};

export default config;
