export interface ReturnsData {
  time: string
  'PNL ($)': number
  'Fees Earned': number
  'Impermanent Loss': number
}

export function reduceChartValues(data: any, type: string): ReturnsData[] | PriceData[] {
  return type === 'price' ? reducePriceData(data) : reduceReturnsData(data)
}

function reduceReturnsData(data: any): ReturnsData[] {
  const { PNL_USD_alt, timestamp, fees_earned_ac, IL_USD } = data
  const chartValues = Object.keys(timestamp).map((key) => {
    const time: string = timestamp[key]
    const pnl: number = PNL_USD_alt[key]
    const fees: number = fees_earned_ac[key]
    const il: number = IL_USD[key]

    return {
      time,
      'PNL ($)': pnl,
      'Fees Earned': fees,
      'Impermanent Loss': il,
    }
  })

  return chartValues
}

export interface PriceData {
  time: string
  Price: number
  'Price Lower Tick': number
  'Price Upper Tick': number
}

function reducePriceData(data: any): PriceData[] {
  const { pini_t1, pini_t0, timestamp, price_tickLow, price_tickUpper } = data
  const chartValues = Object.keys(timestamp).map((key) => {
    const time: string = timestamp[key]
    const price: number = pini_t1[key] / pini_t0[key]
    const lowerTick: number = price_tickLow[key]
    const upperTick: number = price_tickUpper[key]

    return {
      time,
      Price: price,
      'Price Lower Tick': lowerTick,
      'Price Upper Tick': upperTick,
    }
  })

  return chartValues
}
