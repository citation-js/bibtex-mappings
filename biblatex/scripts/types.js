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

const biblatexTypes = Object.keys(sheets)
const biblatexAliases = {
  conference: 'inproceedings',
  electronic: 'online',
  mastersthesis: 'thesis',
  phdthesis: 'thesis',
  techreport: 'report'
}

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
  const resolved = resolveBiblatexType(biblatexType)
  const cslType = getCslType(resolved)
  if (!cslType) { continue }
  output.mappings.source[biblatexType] = cslType

  const required = sheets[biblatexType].required || sheets[resolved].required
  if (!required) { continue }
  if (!(required in requiredReverse)) {
    requiredReverse[required] = output.requiredFields.values.push(required) - 1
  }
  output.requiredFields.types[biblatexType] = requiredReverse[required]
}
for (let alias in biblatexAliases) {
  output.mappings.target[alias] = getCslType(resolveBiblatexType(biblatexAliases[alias]))
}

for (let cslType in csl) {
  output.mappings.target[cslType] = csl[cslType]
}

function getCslType (biblatexType) {
  if (biblatexType in biblatex) {
    return biblatex[biblatexType]
  } else {
    return undefined
  }
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

fs.writeFileSync(path.join(__dirname, '../output/types.json'), JSON.stringify(output.mappings, null, 2))
fs.writeFileSync(path.join(__dirname, '../output/required.json'), JSON.stringify(output.requiredFields, null, 2))
