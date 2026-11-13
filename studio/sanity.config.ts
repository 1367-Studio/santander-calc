import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {RateCardPreview} from './components/RateCardPreview'

export default defineConfig({
  name: 'default',
  title: 'Santander — Rate Studio',

  projectId: '0bw3bd6q',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Rate Studio')
          .items([
            S.listItem()
              .title('Rate cards')
              .schemaType('rateCard')
              .child(
                S.documentTypeList('rateCard')
                  .title('Rate cards')
                  .defaultOrdering([{field: 'validFrom', direction: 'desc'}]),
              ),
            S.divider(),
            S.listItem()
              .title('Legacy bands (v1 JSON pipeline)')
              .schemaType('revolvingRateBand')
              .child(S.documentTypeList('revolvingRateBand').title('Legacy bands')),
          ]),
      defaultDocumentNode: (S, {schemaType}) =>
        schemaType === 'rateCard'
          ? S.document().views([S.view.form(), S.view.component(RateCardPreview).title('Preview & checks')])
          : S.document(),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
