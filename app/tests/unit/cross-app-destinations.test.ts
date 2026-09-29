import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'
import { crossAppHref } from '@/lib/cross-app/links'

const links = {
  app: 'investment',
  targets: {
    info: { web_base_url: 'https://info.example.test' },
    knowledge: { web_base_url: 'https://knowledge.example.test' },
  },
}

describe('where investment takes people', () => {
  it('goes to the request page of info with the code and the delegation as reference', () => {
    // AT-INV-12：代码已填好；链接里没有身份与令牌
    const href = crossAppHref({
      links,
      destination: destinations['info.request'],
      locale: 'zh-CN',
      values: { code: '600519' },
      ref: '01a0ed51-828f-7b13-b95c-a0151a5154a8',
    })
    expect(href).toBe(
      'https://info.example.test/zh-CN/requests/new?code=600519&from=investment&ref=01a0ed51-828f-7b13-b95c-a0151a5154a8',
    )
    expect([...new URL(href as string).searchParams.keys()].sort()).toEqual(['code', 'from', 'ref'])
  })

  it('goes to the catalog and to a dataset of knowledge', () => {
    expect(
      crossAppHref({ links, destination: destinations['knowledge.catalog'], locale: 'en' }),
    ).toBe('https://knowledge.example.test/en/catalog?from=investment')
    expect(
      crossAppHref({
        links,
        destination: destinations['knowledge.dataset'],
        locale: 'en',
        values: { dataset: 'sh600276-financials' },
      }),
    ).toBe('https://knowledge.example.test/en/catalog/sh600276-financials?from=investment')
  })

  it('goes nowhere else', () => {
    expect(Object.keys(destinations).sort()).toEqual([
      'info.request',
      'knowledge.catalog',
      'knowledge.dataset',
    ])
  })
})
