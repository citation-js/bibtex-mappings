const fs = require('fs')
const path = require('path')
const { biblatex, csl } = require('../source/types')

const sheetNames = [
  'Data Fields',
  'Special Fields',
  'Custom Fields',
  'Field Aliases'
]

const info = {}
const charRangePattern = /\{\[(.)--(.)]}/
const chars = ['a', 'b', 'c', 'd', 'e', 'f']

for (const name of sheetNames) {
  const sheet = fs.readFileSync(path.join(__dirname, `../sheets/${name}.tsv`), 'utf8')
    .split('\n')
    .slice(1)

  for (const row of sheet) {
    let [field, fieldType, dataType, description] = row.split('\t')

    const fields = []
    if (/\{\[/.test(field)) {
      const [start, end] = field.match(charRangePattern).slice(1, 3)
      for (let i = chars.indexOf(start); i <= chars.indexOf(end); i++) {
        fields.push(field.replace(charRangePattern, chars[i]))
      }
    } else {
      fields.push(field)
    }

    [fieldType, dataType] = parseType(fieldType, dataType)

    for (const field of fields) {
      info[field] = {
        field,
        fieldType,
        dataType,
        description: description.slice(0, 50)
      }
    }
  }
}

// Custom
info.numpages = {
  field: 'numpages',
  fieldType: 'field',
  dataType: 'integer'
}
info.pmid = {
  field: 'pmid',
  fieldType: 'field',
  dataType: 'literal'
}
info.pmcid = {
  field: 'pmcid',
  fieldType: 'field',
  dataType: 'literal'
}

function parseType (fieldType, dataType) {
  if (dataType.startsWith('Pattern')) {
    return [fieldType, 'gender']
  } else if (dataType.startsWith('separated')) {
    const newType = dataType.split(' ').pop()
    if (newType === 'values') {
      return ['separated', 'literal']
    } else if (newType === 'entrykeys') {
      return ['separated', 'entry key']
    } else {
      return ['separated', newType]
    }
  } else if (dataType === 'integer or literal') {
    return [fieldType, 'literal']
  } else {
    return [fieldType, dataType.replace(/\\LFMark$/, '')]
  }
}

const dataLevels = [
  'literal',
  'name',
  'key',
  'date',
  'verbatim',
  'range',
  'uri',
  'integer',
  'entry key',
  'code',
  'gender',
  'identifier',
  'options',
  'string'
]

const fieldLevels = [
  'field',
  'list',
  'separated'
]

for (let field of Object.values(info)) {
  field.n = dataLevels.indexOf(field.dataType) +
    (2 ** Math.ceil(Math.log2(dataLevels.length))) * fieldLevels.indexOf(field.fieldType)
}

const file = Object.fromEntries(Object.values(info).map(({ field, fieldType, dataType }) => {
  return [field, [fieldType, dataType]]
}))

fs.writeFileSync(__dirname + '/../output/fieldTypes.json', JSON.stringify(file, null, 2))
