const fs = require('fs').promises
const path = require('path')

async function main () {
  const docs = await fs.readFile(path.join(__dirname, '../biblatex/doc/latex/biblatex/biblatex.tex'), 'utf8')
  const tables = parse(docs).slice(0, 4)

  for (let { name, table } of tables) {
    await fs.writeFile(path.join(__dirname, `../sheets/${name}.tsv`), format(table))
  }
}

main().catch(console.error)

//============================================================================//

const LIST = /\\subsubsection\{(?<name>(?:Regular Types|[\w-]+ Fields))\}.+?\\begin\{(?<type>field|type)list\}(?<list>.+?)\\end\{\k<type>list\}/gs
const ITEM = {
    field: /\\(?<fieldType>field|list)item\{(?<key>.*?)\}\{(?<dataType>.*?)\}(?<description>.*?)(?=\n\n\\)/gs,
    type: /\\typeitem\{(?<type>.*?)\}(?<description>.*?)\\reqitem\{(?<required>.*?)\}\n\\optitem\{(?<optional>.*?)\}|\\typeitem\{(?<type1>.*?)\}(?<description1>.*?)(?=\\typeitem)/gs,
}

function parse (docs) {
    return Array.from(docs.matchAll(LIST))
        .map(({ groups: { name, list, type } }) => ({
            name,
            table: toTable(type, Array.from(list.matchAll(ITEM[type])).map(match => match.groups))
        }))
}

function toTable (type, list) {
    return list.map(value => {
        switch (type) {
            case 'type': return [value.type || value.type1, value.required, value.optional, formatDescription(value.description || value.description1)]
            case 'field': return [value.key, value.fieldType, value.dataType, formatDescription(value.description)]
        }
    })
}

function formatDescription (text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/"=/, '-')
}

function format (table) {
    return table.map(row => row.join('\t')).join('\n')
}
