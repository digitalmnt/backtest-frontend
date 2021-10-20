import axios from 'axios'
import { Position } from '@uniswap/v3-sdk'

const TIMEOUT = 30000
const HOST = 'https://6d0p1sigrh.execute-api.eu-west-1.amazonaws.com/prod'

const awsInstance = axios.create({
  baseURL: HOST,
  timeout: TIMEOUT,
  headers: { 'content-type': 'application/json', accept: 'application/json' },
})

const signedInstance = axios.create({
  baseURL: 'https://signedpayloads.s3.eu-west-1.amazonaws.com/',
  timeout: TIMEOUT,
})

async function poll(fn: any) {
  let result = await fn()
  while (!result) {
    await wait()
    result = await fn()
  }
  return result
}

async function checkFileStatus(fileName: string) {
  try {
    await signedInstance.head(`/${fileName}`)
    return true
  } catch (e) {
    return false
  }
}

function wait(ms = 5000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export interface BackTestParams {
  position: Position
  bTType?: string
  range: {
    start: string
    end: string
  }
  gas?: string
  period?: string
  settings?: number
  ticks: Ticks
  fiatValue?: number
  poolName?: string
  fileName?: string
}

export async function initiateSwapsDownload(start: string, end: string, pool: string) {
  pool = pool.toLowerCase()
  const fileName = `swap_results${pool.slice(0, 5)}${start}${end}`
  awsInstance.get(`/swap_data/pool_query?pools=${pool}&date_a=${start}&date_b=${end}&name_file=${fileName}`, {})

  const swapResults = await poll(async () => {
    const status = await checkFileStatus(fileName)
    return status
  })
  if (swapResults) {
    const finalResults = await signedInstance.get(`/${fileName}`)
    return finalResults
  }
  return false
}

interface Ticks {
  LOWER?: number | undefined
  UPPER?: number | undefined
}

export interface InputParams {
  bTType?: string
  range: {
    start: string
    end: string
  }
  gas?: string
  period?: string
  settings?: {
    dynamicRange: number
    hours: number
  }
  ticks: Ticks
  fiatValue?: any
  poolName?: string
  fileName?: string
  dataFileName?: string
}

interface BuildParams {
  poolName: string | undefined
  parameters: any
  dataFileName: string | undefined
}

function buildParams({ poolName, parameters, dataFileName }: BuildParams) {
  const cases = {
    case0: [poolName, ...Object.values(parameters)],
  }

  const btResultFile = `bt_results${cases.case0}`
  const queryParams = {
    data: `https://signedpayloads.s3.eu-west-1.amazonaws.com/${dataFileName}`,
    cases,
    file_name: btResultFile,
  }

  return { queryParams, btResultFile }
}

export function formatDynamicParameters({
  range,
  gas,
  settings,
  ticks,
  fiatValue,
  poolName,
  dataFileName,
  period,
}: InputParams) {
  const timeRange = period === '% of Price' ? '%_of_price' : period
  const parameters = {
    period: timeRange,
    range_price: [settings?.dynamicRange, settings?.dynamicRange],
    hours_rebalance: settings?.hours,
    date_a: range.start,
    USD_pos: Number(fiatValue),
    gas_price: Number(gas),
  }
  return buildParams({ poolName, parameters, dataFileName })
}

export function formatSimpleParameters({ range, gas, ticks, fiatValue, poolName, dataFileName }: InputParams) {
  const parameters = {
    rebalancing_method: 'Fix_0D',
    range_price: [ticks.LOWER, ticks.UPPER],
    hours_rebalanace: 0,
    date_a: range.start,
    USD_pos: Number(fiatValue),
    gas_price: Number(gas),
  }

  return buildParams({ poolName, parameters, dataFileName })
}

export function initiateBacktestResults(queryParams: any) {
  awsInstance.post('/backtest/', {
    df: queryParams,
  })
}

export async function fetchFinalResults(btFileName: string, poolName: string) {
  const btResultFile = encodeURIComponent(btFileName)
  const finalResult = await poll(async () => {
    const btFileStatus = await checkFileStatus(btResultFile)
    return btFileStatus
  })
  if (finalResult) {
    const swapResults: any = await signedInstance.get(`/${btResultFile}`)
    const simpleResult = poolName ? swapResults?.data?.Results_all?.[poolName] : {}
    const parsedResponse = simpleResult && JSON.parse(simpleResult)
    return parsedResponse
  }
  return
}
