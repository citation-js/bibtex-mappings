const types = require('./types')

const TYPE = Symbol('BibTeX type')
const LABEL = Symbol('BibTeX label')

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,

  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
}

// Parse "April 1st", "24th December", "1 jan" since Oren Patashnik recommends
// people put the day number in the month field. To be fair, that *was* way back
// in February 8, 1988.
//
// See point 9 of section 4 of the BibTeX manual v0.99b
// http://mirrors.ctan.org/biblio/bibtex/base/btxdoc.pdf (accessed 2020-09-12)
function parseMonth (value) {
  if (value == null) {
    return []
  }

  if (parseInt(value, 10)) {
    return [parseInt(value, 10)]
  }

  value = value.trim().toLowerCase()
  if (value in MONTHS) {
    return [MONTHS[value]]
  }

  const parts = value.split(/\s+/)
  let month
  let day

  if (parts[0] in MONTHS) {
    month = MONTHS[parts[0]]
    day = parseInt(parts[1])
  } else if (parts[1] in MONTHS) {
    month = MONTHS[parts[1]]
    day = parseInt(parts[0])
  }

  return day ? [month, day] : month ? [month] : []
}

const name = new util.Translator([
  { source: 'given', target: 'given' },
  { source: 'family', target: 'family' },
  { source: 'suffix', target: 'suffix' },
  { source: 'prefix', target: 'non-dropping-particle' },
])

const Converters = {
  PICK: {
    toTarget (...args) {
      return args.find(Boolean)
    },
    toSource (value) {
      return [value]
    }
  },

  YEAR_MONTH: {
    toTarget (year, month) {
      if (isNaN(+year)) {
        return { literal: year }
      } else {
        return { 'date-parts': [[+year, ...parseMonth(month)]] }
      }
    }
  },
  // (Unconvential) convention of setting
  //     howpublished = {\url{https://example.org/some/page}}
  HOW_PUBLISHED: {
    toTarget (howPublished) {
      if (howPublished.startsWith('url')) {
        return howPublished.slice(3)
      }
    }
  },
  NAMES: {
    toTarget (list) { return list.map(name.convertToTarget) },
    toSource (list) { return list.map(name.convertToSource) }
  },
  // TODO: multiple ranges
  PAGES: {
    toTarget (text) { return text.replace(/[–—]/, '-') },
    toSource (text) { return text.replace('-', '--') }
  },
  TYPE: {
    toTarget (sourceType) {
      const type = types.source[sourceType] || 'book'

      if (type === 'mastersthesis') {
        return [type, 'Master\'s thesis']
      } else if (type === 'phdthesis') {
        return [type, 'PhD thesis']
      } else {
        return [type]
      }
    },
    toSource (targetType, genre) {
      const type = types.target[type] || 'misc'

      if (genre === 'Master\'s thesis') {
        return 'mastersthesis'
      } else if (genre === 'PhD thesis') {
        return 'phdthesis'
      } else {
        return type
      }
    }
  }
}

const bibtex = new util.Translator([
  {
    source: 'annote',
    target: 'annote'
  },
  {
    source: 'address',
    target: 'publisher-place',
    convert: Converters.PICK
  },
  {
    source: 'author',
    target: 'author',
    convert: Converters.NAMES
  },
  {
    source: 'chapter',
    target: 'chapter-number'
  },
  {
    source: 'number',
    target: 'collection-number',
    when: {
      source: {
        [TYPE]: [
          'book',
          'mvbook',
          'inbook',
          'collection',
          'mvcollection',
          'incollection',
          'suppcollection',
          'manual',
          'suppperiodical',
          'proceedings',
          'mvproceedings',
          'refererence'
        ]
      },
      target: {
        type: [
          'bill',
          'book',
          'broadcast',
          'chapter',
          'dataset',
          'entry',
          'entry-dictionary',
          'entry-encyclopedia',
          'figure',
          'graphic',
          'interview',
          'legislation',
          'legal_case',
          'manuscript',
          'map',
          'motion_picture',
          'musical_score',
          'pamphlet',
          'post',
          'post-weblog',
          'personal_communication',
          'review',
          'review-book',
          'song',
          'speech',
          'thesis',
          'treaty',
          'webpage'
        ]
      }
    }
  },
  {
    source: 'series',
    target: 'collection-title'
  },
  {
    source: 'booktitle',
    target: 'container-title',
    when: {
      target: {
        type: ['chapter']
      }
    }
  },
  {
    source: 'journal',
    target: 'container-title',
    when: {
      source: {
        [TYPE]: 'article'
      },
      target: {
        type: [
          'article',
          'article-newspaper',
          'article-journal',
          'article-magazine'
        ]
      }
    }
  },
  {
    source: 'edition',
    target: 'edition'
  },
  {
    source: 'editor',
    target: 'editor',
    convert: Converters.NAMES
  },
  {
    source: 'type',
    target: 'genre',
    when: {
      source: { [TYPE]: 'techreport' },
      target: { type: 'report' }
    }
  },
  {
    source: LABEL,
    target: ['id', 'citation-label'],
    convert: {
      toTarget (value) { return [value, value] },
      toSource (id, label) { return id || label }
    }
  },
  {
    source: 'number',
    target: 'issue',
    when: {
      source: {
        [TYPE]: ['article', 'periodical', 'inproceedings']
      },
      target: {
        issue (issue) {
          return typeof issue === 'number' || issue.match(/\d+/)
        },
        type: [
          'article',
          'article-journal',
          'article-newspaper',
          'article-magazine',
          'paper-conference'
        ]
      }
    }
  },
  {
    source: ['year', 'month'],
    target: 'issued',
    convert: Converters.YEAR_MONTH
  },
  {
    source: 'note',
    target: 'note'
  },
  {
    source: 'number',
    target: 'number',
    when: {
      source: { [TYPE]: ['patent', 'report', 'techreport'] },
      target: { type: ['patent', 'report'] }
    }
  },
  {
    source: 'pages',
    target: 'page',
    convert: Converters.PAGES
  },
  {
    source: 'publisher',
    target: 'publisher',
    convert: Converters.PICK,
    when: {
      target: {
        // All except manuscript, paper-conference, techreport and thesis
        type: [
          'article',
          'article-journal',
          'article-magazine',
          'article-newspaper',
          'bill',
          'book',
          'broadcast',
          'chapter',
          'classic',
          'collection',
          'dataset',
          'document',
          'entry',
          'entry-dictionary',
          'entry-encyclopedia',
          'event',
          'figure',
          'graphic',
          'hearing',
          'interview',
          'legal_case',
          'legislation',
          'map',
          'motion_picture',
          'musical_score',
          'pamphlet',
          'patent',
          'performance',
          'periodical',
          'personal_communication',
          'post',
          'post-weblog',
          'regulation',
          'review',
          'review-book',
          'software',
          'song',
          'speech',
          'standard',
          'treaty',
          'webpage'
        ]
      }
    }
  },
  {
    source: 'organization',
    target: 'publisher',
    convert: Converters.PICK,
    when: {
      source: { publisher: false },
      target: { type: 'paper-conference' }
    }
  },
  {
    source: 'institution',
    target: 'publisher',
    convert: Converters.PICK,
    when: {
      source: {
        publisher: false,
        organization: false
      },
      target: { type: 'report' }
    }
  },
  {
    source: 'school',
    target: 'publisher',
    convert: Converters.PICK,
    when: {
      source: {
        institution: false,
        organization: false,
        publisher: false
      },
      target: { type: 'thesis' }
    }
  },
  {
    source: 'howpublished',
    target: 'publisher',
    convert: Converters.PICK,
    when: {
      source: {
        publisher: false,
        organization: false,
        institution: false,
        school: false
      },
      target: {
        type: 'manuscript'
      }
    }
  },
  {
    source: 'title',
    target: 'title'
  },
  {
    source: TYPE,
    target: ['type', 'genre'],
    convert: Converters.TYPE
  },
  {
    source: 'howpublished',
    target: 'URL',
    convert: Converters.HOW_PUBLISHED,
    when: { target: false }
  },
  {
    source: 'volume',
    target: 'volume'
  }
])

function crossref (entry, registry) {
  if (entry.crossref in registry) {
    const parent = registry[entry.crossref].properties
    if (parent === entry) {
      return entry
    }

    return Object.assign(crossref(parent, registry), entry)
  }

  return entry
}

export function parse (input) {
  const registry = {}

  for (const entry of input) {
    registry[entry.label] = entry
  }

  return input.map(({ type, label, properties }) => biblatex.convertToTarget({
    [TYPE]: type,
    [LABEL]: label,
    ...crossref(properties, registry)
  }))
}

export function format (input) {
  return input.map(entry => {
    const { [TYPE]: type, [LABEL]: label, ...properties } = biblatex.convertToSource(entry)
    return { type, label, properties }
  })
}
