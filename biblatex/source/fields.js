// References to sections point to, unless stated otherwise, sections in
// version 3.13 of the biblatex package documentation, available at
// http://mirrors.ctan.org/macros/latex/contrib/biblatex/doc/biblatex.pdf

function parseDate (date) {
  return date.split('T')[0].split('-').map(Number)
}

const TYPE = Symbol('BibTeX type')
const LABEL = Symbol('BibTeX label')

// isan: /^(?:ISAN )?(?:[0-9a-f]{4}-){4}[0-9a-z](?:-(?:[0-9a-f]{4}-){2}[0-9a-z])?$/i
// ismn: /^(?:979-?0-?|M-?)(?:\d{9}|(?=[\d-]{11}$)\d+-\d+-\d)$/i
// isrn: /^ISRN .{1,36}$/
// iswc: /^(?:ISWC )?T-?\d{9}-?\d$/
const STANDARD_NUMBERS_PATTERN = /(^(?:ISAN )?(?:[0-9a-f]{4}-){4}[0-9a-z](?:-(?:[0-9a-f]{4}-){2}[0-9a-z])?$)|(^(?:979-?0-?|M-?)(?:\d{9}|(?=[\d-]{11}$)\d+-\d+-\d)$)|(^ISRN .{1,36}$)|(^(?:ISWC )?T-?\d{9}-?\d$)/i

const Converters = {
  PICK: {
    toTarget (...args) {
      return args.find(Boolean)
    },
    toSource (value) {
      return [value]
    }
  },

  // See section 2.3.8
  DATE: {
    toTarget (date) {
      return {
        'date-parts': date
          .split('/')
          .map(part => part ? parseDate(part) : undefined)
      }
    },
    toSource (date) {
      if ('date-parts' in date) {
        return date['date-parts'].map(part => part.join('-')).join('/')
      }
    }
  },
  YEAR_MONTH: {
    toTarget (year, month) {
      return { 'date-parts': [[year, month]] }
    }
  },
  // See section 3.13.7
  EPRINT: {
    toTarget (id, type) {
      if (type === 'pubmed') {
        return id
      }
    },
    toSource (id) {
      return [id, 'pubmed']
    }
  },
  KEYWORDS: {
    toTarget (list) { return Converters.LIST.toTarget(list).join(',') },
    toSource (list) { return Converters.LIST.toSource(list.split(',')) }
  },
  LIST: {
    toTarget (text) {
      text = text.replace(/ and others$/, '')
      const list = []
      let delimEnd = 0
      let braceLevel = 0

      for (let i = 0; i < text.length; i++) {
        if (braceLevel === 0 && text.slice(i, i + 5) === ' and ') {
          list.push(text.slice(delimEnd, i))
          delimEnd = i + 5
        } else if (text[0] === '{') {
          braceLevel++
        } else if (text[0] === '}') {
          braceLevel--
        }
      }

      return list
    },
    toSource (list) {
      return list
        .map(item => item.includes(' and ') ? `{${item}}` : item )
        .join(' and ')
    }
  },
  NAMES: {
    toTarget (list) { return Converters.LIST.toTarget(list).map(parseName) },
    toSource (list) { return Converters.LIST.toSource(list.map(formatName)) }
  },
  PAGES: {
    toTarget (text) { return text.replace('--', '-') },
    toSource (text) { return text.replace('-', '--') }
  },
  RICH_TEXT: {
    toTarget (tex) {

    }
  },
  STANDARD_NUMBERS: {
    toTarget (...args) {
      return args.find(Boolean)
    },
    toSource (number) {
      const match = number.toString().match(STANDARD_NUMBERS_PATTERN)
      return match ? match.slice(1, 5) : undefined
    }
  },
  STATUS: {

  },
  TYPE: {

  },
  URL: {

  }
}

const nonSpec = [
  {
    source: 'numpages',
    target: 'number-of-pages',
    when: {
      source: { pagetotal: false },
      target: false
    }
  },
  {
    source: 'pmid',
    target: 'PMID',
    when: {
      source: {
        eprinttype (type) { return type !== 'pmid' },
        archiveprefix (type) { return type !== 'pmid' }
      },
      target: false
    }
  },
  {
    source: 'pmcid',
    target: 'PMCID',
    when: {
      target: false
    }
  }
]

const aliases = [
  {
    source: 'annote',
    target: 'annote',
    convert: Converters.RICH_TEXT,
    when: {
      source: { annotation: false },
      target: false
    }
  },
  {
    source: 'address',
    target: 'publisher-place',
    when: {
      source: { location: false },
      target: false
    }
  },
  {
    source: ['eprint', 'archiveprefix'],
    target: 'PMID',
    convert: Converters.EPRINT,
    when: {
      source: { eprinttype: false },
      target: false
    }
  },
  {
    source: 'journal',
    target: 'container-title',
    convert: Converters.RICH_TEXT,
    when: {
      source: {
        maintitle: false,
        booktitle: false,
        journaltitle: false
      },
      target: false
    }
  },
  {
    source: 'school',
    target: 'publisher',
    when: {
      source: {
        institution: false,
        organization: false,
        publisher: false
      },
      target: false
    }
  }
]

module.exports = [
  ...aliases,
  ...nonSpec,
  {
    source: 'abstract',
    target: 'abstract',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'urldate',
    target: 'accessed',
    convert: Converters.DATE
  },
  {
    source: 'annotation',
    target: 'annote',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'author',
    target: 'author',
    convert: Converters.NAMES
  },
  {
    source: 'library',
    target: 'call-number'
  },
  {
    source: 'chapter',
    target: 'chapter-number'
  },
  {
    source: 'bookauthor',
    target: 'container-author',
    convert: Converters.NAMES
  },

  // Regarding maintitle, booktitle & journaltitle:
  //     When importing, maintitle is preferred, since it represents the
  // larger container. When exporting, booktitle is preferred since
  // it is more common, unless number-of-volumes is present indicating a
  // multi-volume book.
  //     journaltitle is only used for articles.
  {
    source: 'maintitle',
    target: 'container-title',
    convert: Converters.RICH_TEXT,
    when: {
      source: true,
      target: { 'number-of-volumes': true }
    }
  },
  {
    source: 'booktitle',
    target: 'container-title',
    convert: Converters.RICH_TEXT,
    when: {
      source: { maintitle: false },
      target: { 'number-of-volumes': false }
    }
  },
  {
    source: 'journaltitle',
    target: 'container-title',
    convert: Converters.RICH_TEXT,
    when: {
      source: { [TYPE]: 'article' },
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
    source: 'shortjournal',
    target: 'container-title-short',
    convert: Converters.RICH_TEXT,
    when: {
      source: { [TYPE]: 'article' },
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
          'report',
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
    target: 'collection-title',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'shortseries',
    target: 'collection-title-short',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'doi',
    target: 'DOI'
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
    source: [TYPE, 'entrysubtype', 'type'],
    target: 'genre',
    convert: Converters.TYPE
  },
  {
    source: 'eventdate',
    target: 'event-date',
    convert: Converters.DATE
  },
  {
    source: 'venue',
    target: 'event-place'
  },
  {
    source: 'eventtitle',
    target: 'event'
  },
  {
    source: 'isbn',
    target: 'ISBN'
  },
  {
    source: 'issn',
    target: 'ISSN'
  },
  {
    source: 'issue',
    target: 'issue',
    when: {
      source: {
        number: false,
        [TYPE]: ['article', 'periodical']
      },
      target: {
        issue (issue) { return typeof issue === 'string' && !issue.match(/\d+/) },
        type: ['article', 'article-journal', 'article-newspaper', 'article-magazine']
      }
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
        issue (issue) { return typeof issue === 'number' || issue.match(/\d+/) },
        type: ['article', 'article-journal', 'article-newspaper', 'article-magazine', 'paper-conference']
      }
    }
  },
  {
    source: 'date',
    target: 'issued',
    convert: Converters.DATE
  },
  {
    source: ['year', 'month'],
    target: 'issued',
    convert: Converters.YEAR_MONTH,
    when: {
      source: { date: false },
      target: false
    }
  },
  {
    source: 'keywords',
    target: 'keyword',
    convert: Converters.LIST
  },
  {
    source: 'language',
    target: 'language'
  },
  {
    source: 'note',
    target: 'note'
  },
  {
    source: ['isan', 'ismn', 'isrn', 'iswc'],
    target: 'number',
    convert: Converters.STANDARD_NUMBERS,
    when: {
      source: {
        [TYPE] (type) { return type !== 'patent' }
      },
      target: {
        type (type) { return type !== 'patent' }
      }
    }
  },
  {
    source: 'number',
    target: 'number',
    when: {
      source: { [TYPE]: 'patent' },
      target: { type: 'patent' }
    }
  },
  {
    source: 'origlocation',
    target: 'original-publisher-place'
  },
  {
    source: 'origpublisher',
    target: 'original-publisher'
  },
  {
    source: 'origtitle',
    target: 'original-title',
    convert: Converters.RICH_TEXT
  },
  {
    source: ['pages', 'eid'],
    target: 'page',
    convert: Converters.PAGES
  },
  {
    source: 'pagetotal',
    target: 'number-of-pages'
  },
  // {
  //   source: 'part',
  //   target: 'part-number'
  // },
  {
    source: ['eprint', 'eprinttype'],
    target: 'PMID',
    convert: Converters.EPRINT
  },
  {
    source: 'location',
    target: 'publisher-place'
  },
  {
    source: 'publisher',
    target: 'publisher',
    when: {
      source: true,
      target: {
        type (type) { return type !== 'webpage' }
      }
    }
  },
  {
    source: 'organization',
    target: 'publisher',
    when: {
      source: {
        publisher: false
      },
      target: {
        type: 'webpage'
      }
    }
  },
  {
    source: 'institution',
    target: 'publisher',
    when: {
      source: {
        publisher: false,
        organization: false
      },
      target: false
    }
  },
  {
    source: 'pubstate',
    target: 'status',
    convert: Converters.STATUS
  },
  {
    source: 'shorttitle',
    target: 'title-short',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'title',
    target: 'title',
    convert: Converters.RICH_TEXT
  },
  {
    source: 'translator',
    target: 'translator',
    convert: Converters.NAMES
  },
  {
    source: ['url', 'howpublished'],
    target: 'URL',
    convert: Converters.URL
  },
  {
    source: 'version',
    target: 'version'
  },
  {
    source: 'volume',
    target: 'volume'
  },
  {
    source: 'volumes',
    target: 'number-of-volumes'
  },
  // {
  //   source: 'issuetitle',
  //   target: 'volume-title',
  //   convert: Converters.RICH_TEXT
  // }
]
