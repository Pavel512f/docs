import { languageKeys } from '../../lib/languages.js'
import { blockIndex } from '../../middleware/block-robots.js'
import { get, getDOMCached as getDOM } from '../helpers/e2etest.js'
import Page from '../../lib/page.js'
import { jest } from '@jest/globals'

const langs = languageKeys.filter((lang) => lang !== 'en')

describe('frame', () => {
  jest.setTimeout(60 * 1000)

  test.each(langs)('allows crawling of %s pages', async (lang) => {
    expect(blockIndex(`/${lang}/articles/verifying-your-email-address`)).toBe(false)
  })

  test.each(langs)('breadcrumbs link to %s pages', async (lang) => {
    const $ = await getDOM(`/${lang}/get-started/learning-about-github`)
    const $breadcrumbs = $('[data-testid=breadcrumbs] a')
    expect($breadcrumbs[0].attribs.href).toBe(`/${lang}/get-started`)
  })

  test.each(langs)('homepage links go to %s pages', async (lang) => {
    const $ = await getDOM(`/${lang}`)
    const $links = $('[data-testid=bump-link]')
    $links.each((i, el) => {
      const linkUrl = $(el).attr('href')
      expect(linkUrl.startsWith(`/${lang}/`)).toBe(true)
    })
  })

  test.each(langs)('includes homepage hreflang to %s', async (lang) => {
    const $ = await getDOM('/en')
    expect($(`link[rel="alternate"][href="https://docs.github.com/${lang}"]`).length).toBe(1)
  })

  test.each(langs)('sets `lang` attribute on <html> attribute in %s', async (lang) => {
    const $ = await getDOM(`/${lang}`)
    expect($('html').attr('lang')).toBe(lang)
  })

  // Docs Engineering issue: 2096
  test.skip.each(langs)('autogenerated heading IDs on %s are in english', async (lang) => {
    const $ = await getDOM(`/${lang}/site-policy/github-terms/github-terms-of-service`)
    expect($('h2 a[href="#summary"]').length).toBe(1)
  })

  test.each(langs)('loads the side bar via site tree in %s', async (lang) => {
    const $en = await getDOM(`/en/get-started`)
    const $ = await getDOM(`/${lang}/get-started`)
    expect($(`a[href="/${lang}/get-started"]`).text()).not.toEqual(
      $en(`a[href="/${lang}/get-started"]`).text()
    )
  })

  // Docs Engineering issue: 2637
  test.skip.each(langs)('loads the survey via site data in %s', async (lang) => {
    const $en = await getDOM(`/en`)
    const $ = await getDOM(`/${lang}`)
    expect($('[data-testid="survey-form"] h2').text()).not.toEqual(
      $en('[data-testid="survey-form"] h2').text()
    )
  })
})

describe('homepage', () => {
  test.each(langs)('homepage in non-default product in non-default language', async (lang) => {
    const $ = await getDOM(`/${lang}/enterprise-cloud@latest`)
    const products = $('[data-testid=product]')
    expect(products.length).toBe(1)
  })

  test.each(langs)('homepage in non-default language has product links', async (lang) => {
    const $ = await getDOM(`/${lang}`)
    const products = $('[data-testid=product]')
    expect(products.length).toBe(1)
  })
})

const page = await Page.init({
  basePath: 'content',
  relativePath: 'admin/release-notes.md',
  languageCode: 'en',
})

describe('release notes', () => {
  // Return an array of tuples for each language and each first version
  // per plan. E.g. ...
  //   [
  //      ['ja', 'enterprise-server@3.8'],
  //      ['pt', 'enterprise-server@3.8'],
  //      ...
  //      ['ja', 'github-ae@latest'],
  //      ['pt', 'github-ae@latest'],
  //      ...
  //
  // This is useful because if we test every single individual version of
  // every plan the test just takes way too long.
  const getReleaseNotesVersionCombinations = (langs) => {
    const combinations = []
    const prefixes = []
    for (const version of page.applicableVersions) {
      const prefix = version.split('@')[0]
      if (prefixes.includes(prefix)) {
        continue
      }
      prefixes.push(prefix)
      combinations.push(...langs.map((lang) => [lang, version]))
    }
    return combinations
  }

  test.each(getReleaseNotesVersionCombinations(langs))(
    'latest release notes',
    async (lang, version) => {
      const url = `/${lang}/${version}/admin/release-notes`
      const res = await get(url)
      expect(res.statusCode).toBe(200)
    }
  )
})
