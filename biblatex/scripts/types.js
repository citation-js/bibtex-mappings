const fs = require('fs')
const path = require('path')
const { biblatex, csl } = require('../source/types')

const sheets = [
  fs.readFileSync(path.join(__dirname, '../sheets/Regular Types.tsv'), 'utf8'),
  fs.readFileSync(path.join(__dirname, '../sheets/Non-standard Types.tsv'), 'utf8')
]
  .join('\n')
  .split('\n')
  .reduce((map, row) => {
    const [type, required, optional, description] = row.split('\t')
    map[type] = { required, optional, description }
    return map
  }, {})

const biblatexAliases = {
  conference: 'inproceedings',
  electronic: 'online',
  mastersthesis: 'thesis',
  phdthesis: 'thesis',
  techreport: 'report',
  www: 'online'
}
const biblatexTypes = Object.keys(sheets).concat(Object.keys(biblatexAliases))

const output = {
  mappings: {
    source: {},
    target: {}
  },
  requiredFields: {
    values: [],
    types: {}
  }
}

const requiredReverse = {}

for (let biblatexType of biblatexTypes) {
  const resolved = resolveBiblatexType(biblatexAliases[biblatexType] || biblatexType)
  const cslType = biblatex[resolved]
  if (!cslType) { continue }
  output.mappings.source[biblatexType] = cslType

  let required = getRequiredFields(biblatexType, resolved)
  if (!required) { continue }
  if (!(required in requiredReverse)) {
    const parsedRequired = required
      .split(', ')
      .map(prop => prop.includes('/') ? prop.split('/') : prop)
    requiredReverse[required] = output.requiredFields.values.push(parsedRequired) - 1
  }
  output.requiredFields.types[biblatexType] = requiredReverse[required]
}

for (let cslType in csl) {
  output.mappings.target[cslType] = csl[cslType]
}

function resolveBiblatexType (biblatexType) {
  if (biblatexType.startsWith('mv')) {
    return resolveBiblatexType(biblatexType.slice(2))
  } else if (biblatexType === 'reference') {
    return resolveBiblatexType('collection')
  } else if (biblatexType === 'collection') {
    return resolveBiblatexType('book')
  } else {
    return biblatexType
  }
}

function getRequiredFields (type, resolved) {
  if (type in sheets) {
    return sheets[type].required
  } else if (['mastersthesis', 'phdthesis', 'techreport'].includes(type) && sheets[resolved].required) {
    return sheets[resolved].required.replace(/, type/, '')
  } else {
    return sheets[resolved].required
  }
}

fs.writeFileSync(path.join(__dirname, '../output/types.json'), JSON.stringify(output.mappings, null, 2))
fs.writeFileSync(path.join(__dirname, '../output/required.json'), JSON.stringify(output.requiredFields, null, 2))
