const fs = require('fs').promises
const path = require('path')

async function main () {
  const docs = await fs.readFile(path.join(__dirname, '../btxdoc.tex'), 'utf8')
  const tables = parse(docs)

  for (let { name, table } of tables) {
    await fs.writeFile(path.join(__dirname, `../sheets/${name}.tsv`), format(table))
  }
}

main().catch(console.error)

//============================================================================//

const LIST = /\\subsection\{(?<type>(?<name>Entry Types|Fields))\}((?!\\subsection).)+\\begin\{description\}(?<list>.+?)\\end\{description\}/gs
const ITEM = {
  'Fields': /\\item\[(?<key>.*?)\\hfill\](?<description>.*?)(?=\n\n(\\|$))/gs,
  'Entry Types': /\\item\[(?<type>.*?)\\hfill\](?<description>.*?)(?:Required fields?: (?<required>.*?)\.\nOptional fields?: (?<optional>.*?)\.|(?=\n\n(\\|$)))/gs
}
const HEADER = {
  'Fields': ['field', 'description'],
  'Entry Types': ['type', 'required', 'optional', 'description']
}
const ROW = {
  'Fields' (value) { return [value.key, formatDescription(value.description)] },
  'Entry Types' (value) { return [value.type, formatFieldList(value.required), formatFieldList(value.optional), formatDescription(value.description)] }
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

function formatFieldList (text) {
  return text ? text.trim().replace(/\s+/g, ' ').replace(/\\hbox\{\\tt|\}/g, '') : text
}

function format (table) {
  return table.map(row => row.join('\t')).join('\n')
}
