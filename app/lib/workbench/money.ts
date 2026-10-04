// 金额：用整数（百万分之一元）算，不用小数算。花费钮和专家页都用。

export function toMicros(amount: string): number | null {
  const found = /^(\d+)(?:\.(\d{1,6}))?$/.exec(amount.trim())
  if (!found) return null
  return Number(found[1]) * 1_000_000 + Number((found[2] ?? '').padEnd(6, '0'))
}

// 页面上的写法。不到一块钱的时候多给一位：一次调用常常只有几分、几厘
export function money(micros: number): string {
  const digits = micros < 1_000_000 ? 3 : 2
  return (micros / 1_000_000).toFixed(digits)
}

export function symbol(currency: string): string {
  return currency === 'CNY' ? '¥' : `${currency} `
}
