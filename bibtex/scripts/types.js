const fs = require('fs')
const path = require('path')
const { bibtex, csl } = require('../source/types')

const sheets = fs
  .readFileSync(path.join(__dirname, '../sheets/Entry Types.tsv'), 'utf8')
  .split('\n')
  .reduce((map, row) => {
    const [type, required, optional, description] = row.split('\t')
    map[type] = { required, optional, description }
    return map
  }, {})

const bibtexTypes = Object.keys(sheets)
const output = {
  mappings: {
    source: {},
    target: {}
  },
  requiredFields: {}
}

for (let bibtexType of bibtexTypes) {
  const cslType = bibtex[bibtexType]
  if (!cslType) { continue }
  output.mappings.source[bibtexType] = cslType

  const required = sheets[bibtexType].required
  if (!required) { continue }
  const parsedRequired = required
    .trim()
    .replace(/ (and\/)?or  /g, '/')
    .split(',  ')
    .map(prop => prop.includes('/') ? prop.split('/') : prop)
  output.requiredFields[bibtexType] = parsedRequired
}

for (let cslType in csl) {
  output.mappings.target[cslType] = csl[cslType]
}

fs.writeFileSync(path.join(__dirname, '../output/types.json'), JSON.stringify(output.mappings, null, 2))
fs.writeFileSync(path.join(__dirname, '../output/required.json'), JSON.stringify(output.requiredFields, null, 2))
