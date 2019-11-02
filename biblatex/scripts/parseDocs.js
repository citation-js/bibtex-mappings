const fs = require('fs').promises
const path = require('path')

async function main () {
  const docs = await fs.readFile(path.join(__dirname, '../biblatex/doc/latex/biblatex/biblatex.tex'), 'utf8')
  const tables = parse(docs).slice(0, -2)

  for (let { name, table } of tables) {
    await fs.writeFile(path.join(__dirname, `../sheets/${name}.tsv`), format(table))
  }
}

main().catch(console.error)

//============================================================================//

const LIST = /\\subsubsection\{(?<name>(?!Data Types)[\w-]+ (Types|Fields|Aliases))\}.+?\\begin\{(?<type>field|type)list\}(?<list>.+?)\\end\{\k<type>list\}/gs
const ITEM = {
  field: /\\(?<fieldType>field|list)item\{(?<key>.*?)\}\{(?<dataType>.*?)\}(?<description>.*?)(?=\n\n(\\|$))/gs,
  type: /\\typeitem\{(?<type>.*?)\}(?<description>.*?)(?:\\reqitem\{(?<required>.*?)\}\n\\optitem\{(?<optional>.*?)\}|(?=\\typeitem|$))/gs
}
const HEADER = {
  field: ['field', 'fieldType', 'dataType', 'description'],
  type: ['type', 'required', 'optional', 'description']
}
const ROW = {
  field (value) { return [value.key, value.fieldType, value.dataType, formatDescription(value.description)] },
  type (value) { return [value.type, value.required, value.optional, formatDescription(value.description)] }
}

function parse (docs) {
  return Array.from(docs.matchAll(LIST))
    .map(({ groups: { name, list, type } }) => ({
      name,
      table: toTable(type, Array.from(list.matchAll(ITEM[type])).map(match => match.groups))
    }))
}

function toTable (type, list) {
  return [HEADER[type], ...list.map(ROW[type])]
}

function formatDescription (text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/"=/g, '-')
}

function format (table) {
  return table.map(row => row.join('\t')).join('\n')
}
