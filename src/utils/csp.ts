import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import {URL} from 'url'

import got from 'got'
import * as cheerio from 'cheerio'
import * as css from 'css'

import {walk} from './file'

const self = "'self'"
const https = 'https:'

const defaultSrc = 'default-src'
const scriptSrc = 'script-src'
const styleSrc = 'style-src'
const fontSrc = 'font-src'
const imgSrc = 'img-src'
const childSrc = 'child-src'
const connectSrc = 'connect-src'

function isUrlSpecialProtocol(url: string) {
  try {
    const protocol = new URL(url).protocol
    return protocol && !/https?/.test(protocol)
  } catch {
    return false
  }
}

function isUrlAbsolute(url: string) {
  return url.indexOf('://') > 0 || url.indexOf('//') === 0
}

function isUrlRelative(url: string) {
  return !isUrlAbsolute(url)
}

function extractUrls(value: string) {
  const re = /(?:url\(['"]?)(.*?)(?:['"]?\))/g
  const urls = []

  let match

  do {
    match = re.exec(value)
    if (match) urls.push(match[1])
  } while (match)

  return urls
}

function getRelativePath(entry: string, url: string) {
  return path.resolve(entry, url.replace(/^\//, ''))
}

function resolveUrl(entry: string, url: string): string {
  if (isUrlSpecialProtocol(url) || isUrlAbsolute(url)) return url

  return getRelativePath(entry, url)
}

async function fetchAsset(url: string): Promise<string | undefined> {
  if (isUrlSpecialProtocol(url)) return undefined

  if (isUrlAbsolute(url)) {
    const {body} = await got(url)
    return body
  } else {
    return fs.readFileSync(url, 'utf-8')
  }
}

/**
 * Get settings from local configuration file.
 *
 * @param entry Path to the publish directory.
 */
export async function generateCsp(entry: string): Promise<string> {
  const csp: Record<string, Array<string>> = {
    [defaultSrc]: [self],
    [scriptSrc]: [self],
    [styleSrc]: [self],
    [fontSrc]: [self],
    [imgSrc]: [self, https],
    [childSrc]: [https],
    [connectSrc]: [https],
  }

  const docs = await walk(entry, /\.html?$/)

  const addUrl = (key: string, url: string) => {
    // Handle protocols like blob: and data:
    if (isUrlSpecialProtocol(url)) {
      csp[key].push(new URL(url).protocol)
      return
    }

    // Already allowing self, so ignore relative paths
    if (isUrlRelative(url)) return

    // Add absolute URL origins
    csp[key].push(new URL(url).origin)
  }

  const processStylesheet = async (style: string, location: string): Promise<void> => {
    const parsed = css.parse(style)
    const {rules} = parsed.stylesheet || {}
    if (!rules) return

    const imports: css.Import[] = rules.filter((rule) => rule.type === 'import')
    for (const cssImport of imports) {
      const value = cssImport.import || ''
      const urls = value.startsWith('url')
        ? extractUrls(value)
        : [value.replace(/['"]+/g, '').split(' ')[0]]

      for (const url of urls) {
        try {
          const root = url.startsWith('/') ? entry : location
          const resolvedUrl = resolveUrl(root, url)
          const style = await fetchAsset(resolvedUrl)
          if (style) await processStylesheet(style, location)
        } catch {}

        addUrl(styleSrc, url)
      }
    }

    const fontFaces: css.FontFace[] = rules.filter((rule) => rule.type === 'font-face')
    for (const fontFace of fontFaces) {
      // @ts-ignore
      for (const dec of fontFace.declarations?.filter((dec) => dec.property === 'src') || []) {
        // @ts-ignore
        for (const url of extractUrls(dec.value)) {
          addUrl(fontSrc, url)
        }
      }
    }

    const canHaveImageUrl = [
      'background',
      'background-image',
      'list-style',
      'list-style-image',
      'content',
      'cursor',
      'border',
      'border-image',
      'border-image-source',
      'mask',
      'mask-image',
    ]

    const imageUrls = rules
      .filter((rule) => rule as css.Rule)
      .map((rule) => rule as css.Rule)
      .flatMap((rule) => rule.declarations)
      .filter((dec) => dec as css.Declaration)
      .map((dec) => dec as css.Declaration)
      .filter((dec) => dec.value && dec.property && canHaveImageUrl.includes(dec.property))
      .flatMap((dec) => extractUrls(dec.value!))

    for (const imageUrl of imageUrls) {
      addUrl(imgSrc, imageUrl)
    }
  }

  for (const doc of docs) {
    const contents = fs.readFileSync(doc)
    const $ = cheerio.load(contents)
    const dir = path.dirname(doc)

    for (const element of $('script, style').toArray()) {
      const isScript = element.type === 'script'
      const isStyle = element.type === 'style'
      const key = isScript ? scriptSrc : styleSrc

      const inline = element.children.length > 0
      if (inline) {
        // @ts-ignore
        const content = element.firstChild?.data
        const hash = crypto.createHash('sha256').update(content).digest('base64')
        csp[key].push(`'sha256-${hash}'`)

        if (isStyle) {
          await processStylesheet(content, dir)
        }

        continue
      }

      const {src} = element.attribs

      if (isStyle) {
        try {
          const root = src.startsWith('/') ? entry : dir
          const resolvedUrl = resolveUrl(root, src)
          const style = await fetchAsset(resolvedUrl)
          if (style) await processStylesheet(style, path.dirname(resolvedUrl))
        } catch {}
      } else if (isScript && isUrlAbsolute(src) && !element.attribs['integrity']) {
        // Generate SRI hashes for external scripts
        const content = await fetchAsset(src)
        if (content) {
          const hash = crypto.createHash('sha384').update(content).digest('base64')
          element.attribs['integrity'] = `sha384-${hash}`
          element.attribs['crossorigin'] = 'anonymous'
        }
      }

      addUrl(key, src)
    }

    for (const element of $('*').toArray()) {
      const style = element.attribs['style']
      if (style) {
        const hash = crypto.createHash('sha256').update(style).digest('base64')
        csp[styleSrc].push("'unsafe-hashes'")
        csp[styleSrc].push(`'sha256-${hash}'`)
      }
    }

    for (const link of $('link').toArray()) {
      if (link.attribs['as'] !== 'stylesheet') continue

      const {href} = link.attribs
      try {
        const root = href.startsWith('/') ? entry : dir
        const resolvedUrl = resolveUrl(root, href)
        const style = await fetchAsset(resolvedUrl)
        if (style) await processStylesheet(style, path.dirname(resolvedUrl))
      } catch {}

      addUrl(styleSrc, href)
    }

    for (const image of $('img').toArray()) {
      const {src} = image.attribs
      addUrl(imgSrc, src)
    }

    for (const frame of $('frame, iframe').toArray()) {
      const {src} = frame.attribs
      addUrl(childSrc, src)
    }

    fs.writeFileSync(doc, $.html())
  }

  return Object.keys(csp)
    .filter((key) => csp[key].length > 0)
    .map((key) => `${key} ${[...new Set(csp[key])].join(' ')}`)
    .join('; ')
}
