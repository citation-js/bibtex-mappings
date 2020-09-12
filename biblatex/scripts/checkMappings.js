const types = require('../output/fieldTypes')
const mappings = require('../source/fields')

for (const { source, convert } of mappings) {
  if (!convert) {
    for (const field of [].concat(source)) {
      if (!types[field]) {
        console.log(field, 'not defined')
        continue
      }

      const [fieldType, dataType] = types[field]
      if (fieldType !== 'field') {
        console.log(source, 'has no converter, needed for', fieldType, dataType)
      }
    }
  }
}
