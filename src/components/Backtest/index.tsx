import { useEffect, useReducer, useState } from 'react'
import { DefaultTheme } from 'styled-components/macro'
import { AutoColumn } from '../Column'
import { DateRangeInput } from '@datepicker-react/styled'
import { TYPE } from '../../theme'
import { StyledInput } from '../../pages/AddLiquidity/styled'
import { ButtonRadioChecked } from '../Button/index'
import { ButtonPrimary } from '../Button/index'
import { Trans } from '@lingui/macro'
import { Pool, Position } from '@uniswap/v3-sdk'
import { Token, CurrencyAmount } from '@uniswap/sdk-core'
import Slider from '../../components/Slider'
import styled from 'styled-components/macro'
import { BTAreaChart } from './AreaChart'
import Loader from '../Loader/index'
import { Text } from 'rebass'
import { sumObjectList } from '../../utils/index'
import { unwrappedToken } from 'utils/unwrappedToken'
import {
  fetchFinalResults,
  initiateBacktestResults,
  initiateSwapsDownload,
  formatSimpleParameters,
  formatDynamicParameters,
  InputParams,
} from '../../services/backtest-service'
import { LightCard } from 'components/Card'
import { reduceChartValues } from './chartData'

const BTButton = styled(ButtonPrimary)`
  max-width: 300px;
`

export const Wrapper = styled.div`
  position: relative;
  padding: 26px 16px;
  min-width: 480px;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    min-width: 400px;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
  min-width: 340px;
`};
`

/* two-column layout where DepositAmount is moved at the very end on mobile. */
export const ResponsiveTwoColumns = styled.div<{ wide: boolean }>`
  display: grid;
  grid-column-gap: 50px;
  grid-row-gap: 15px;
  grid-template-columns: ${({ wide }) => (wide ? '1fr 1fr' : '1fr')};
  grid-template-rows: max-content;
  grid-auto-flow: row;

  padding: 20px 0;

  border-top: 1px solid ${({ theme }) => theme.bg2};

  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;

    margin-top: 0;
  `};
`

const initialState = {
  startDate: null,
  endDate: null,
  focusedInput: null,
}

function dateReducer(btRange: any, action: any) {
  switch (action.type) {
    case 'focusChange':
      return { ...btRange, focusedInput: action.payload }
    case 'dateChange':
      if (action.payload.startDate) {
        action.payload.startDateFormatted = action.payload.startDate.toLocaleString('fr-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      }
      if (action.payload.endDate) {
        action.payload.endDateFormatted = action.payload.endDate.toLocaleString('fr-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      }
      return action.payload
    default:
      throw new Error()
  }
}
interface DateRange {
  start: string
  end: string
}

interface DateProps {
  updateDateRange: ({ start, end }: DateRange) => void
}

const FocusedAutoColumn = styled(AutoColumn)`
  z-index: 200;
`

const charts = [
  {
    type: 'returns',
    label: 'Strategy returns ($)',
    reducer: (results: any, type: string) => reduceChartValues(results, type),
  },
  {
    type: 'price',
    label: 'Pair prices and strategy range',
    reducer: (results: any, type: string) => reduceChartValues(results, type),
  },
]

function ChartAndLabel({
  results,
  chartType,
  label,
  reducer,
}: {
  results: any[]
  chartType: string
  label: string
  reducer: any
}) {
  return (
    <>
      <FullBlock>
        <TYPE.label>{label}</TYPE.label>
      </FullBlock>
      <FullBlock>
        <BTAreaChart chartDataValues={reducer(results, chartType)} chartType={chartType} />
      </FullBlock>
    </>
  )
}

export function BTDateRange({ updateDateRange }: DateProps) {
  const [btRange, dispatch] = useReducer(dateReducer, initialState)
  useEffect(() => {
    updateDateRange({ start: btRange.startDateFormatted, end: btRange.endDateFormatted })
  }, [btRange])

  return (
    <FocusedAutoColumn gap={'md'}>
      <TYPE.label>4. Backtest time range:</TYPE.label>
      <DateRangeInput
        onDatesChange={(data) => dispatch({ type: 'dateChange', payload: data })}
        onFocusChange={(focusedInput) => dispatch({ type: 'focusChange', payload: focusedInput })}
        startDate={btRange.startDate} // Date or null
        endDate={btRange.endDate} // Date or null
        focusedInput={btRange.focusedInput} // START_DATE, END_DATE or null
        maxBookingDate={new Date()}
        minBookingDate={new Date('06-15-2021')}
      />
    </FocusedAutoColumn>
  )
}

interface GasProps {
  updateGas: (tye: string) => void
}

export function GasInput({ updateGas }: GasProps) {
  const [gasPrice, setGas] = useState('')
  useEffect(() => {
    updateGas(gasPrice)
  }, [gasPrice])

  return (
    <AutoColumn gap={'md'}>
      <TYPE.label>5. Gas Price (gwei):</TYPE.label>
      <StyledInput
        value={gasPrice}
        placeholder="0.0"
        onUserInput={(val) => {
          setGas(val)
        }}
      />
    </AutoColumn>
  )
}

interface BTType {
  updateBTType: (tye: string) => void
}

export function BTType({ updateBTType }: BTType) {
  const [type, setType] = useState('simple')
  useEffect(() => {
    updateBTType(type)
  }, [type, updateBTType])

  return (
    <ResponsiveTwoColumns wide={true}>
      <AutoColumn gap={'md'}>
        <ButtonRadioChecked width="100%" active={type === 'simple'} onClick={() => setType('simple')}>
          <TYPE.label>Simple</TYPE.label>
        </ButtonRadioChecked>
      </AutoColumn>
      <AutoColumn gap={'md'}>
        <ButtonRadioChecked width="100%" active={type === 'dynamic'} onClick={() => setType('dynamic')}>
          <TYPE.label>Dynamic</TYPE.label>
        </ButtonRadioChecked>
      </AutoColumn>
    </ResponsiveTwoColumns>
  )
}

interface RebalanceProps {
  updateRebalancePeriod: (period: string) => void
}

export function RebalancePeriod({ updateRebalancePeriod }: RebalanceProps) {
  const [rebalanceP, setrebalanceP] = useState('STD_1D')
  useEffect(() => {
    updateRebalancePeriod(rebalanceP)
  }, [rebalanceP])

  const periods = [
    {
      label: '% of Price',
      value: '% of Price',
    },
    {
      label: 'Volatility 1 Day',
      value: 'STD_1D',
    },
    {
      label: 'Volatility 3 Days',
      value: 'STD_3D',
    },
    {
      label: 'Volatility 5 Days',
      value: 'STD_5D',
    },
    {
      label: 'Volatility 7 Days',
      value: 'STD_7D',
    },
  ]
  return (
    <AutoColumn gap={'md'}>
      <TYPE.label>Rebalance Method:</TYPE.label>
      {periods.map((period) => (
        <ButtonRadioChecked
          key={period.value}
          width="100%"
          active={rebalanceP === period.value}
          onClick={() => setrebalanceP(period.value)}
        >
          <TYPE.label>{period.label}</TYPE.label>
        </ButtonRadioChecked>
      ))}
    </AutoColumn>
  )
}

interface SettingsProps {
  updateSettings: (dynamicRange: number, hours: number) => void
  currentPeriod: string
}

export function RebalanceSettings({ updateSettings, currentPeriod }: SettingsProps) {
  const [dynamicRange, updateDynamicRange] = useState(0)
  const [hours, setHours] = useState(0)

  useEffect(() => {
    updateSettings(dynamicRange, hours)
  }, [dynamicRange, currentPeriod, hours])

  return (
    <AutoColumn gap={'md'} justify="space-between">
      <div>
        <TYPE.label>Hours to wait before rebalancing: {hours}</TYPE.label>
        <Slider value={hours} onChange={setHours} max={23} min={0} />
      </div>
      <div>
        <TYPE.label>
          {currentPeriod === '% of Price' ? 'Rebalance at percent of price: ' : 'Bolinger Band Range: '}
          {dynamicRange}
          {currentPeriod === '% of Price' && '%'}
        </TYPE.label>
        <Slider
          value={dynamicRange}
          onChange={updateDynamicRange}
          max={currentPeriod === '% of Price' ? 100 : 23}
          min={currentPeriod === '% of Price' ? 0 : 0}
        />
      </div>
    </AutoColumn>
  )
}

interface Ticks {
  LOWER?: number | undefined
  UPPER?: number | undefined
}

interface BTProps {
  ticks: Ticks
  position: Position | undefined
  fiatValue: number | string
  theme: DefaultTheme
  hasPosition: CurrencyAmount<Token> | null
  updateBTParentType: (btType: string) => void
}

function findPoolAddress(position: Position) {
  return Pool.getAddress(position.pool.token0, position.pool.token1, position.pool.fee)
}

const FullBlock = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
`

interface BackTestParams extends InputParams {
  position: Position
}

const lastVal = (results: any, key: string, decimals = 4) =>
  parseFloat(results[key][Object.keys(results[key]).length - 1]).toFixed(decimals)

export function BackTest({ ticks, position, fiatValue, hasPosition, updateBTParentType }: BTProps) {
  const [bTType, updateBTType] = useState<string>('simple')
  const [range, updateRange] = useState({
    start: '',
    end: '',
  })
  const [gas, updateGas] = useState<string>('')
  const [period, updatePeriod] = useState<string>('STD_1D')
  const [settings, updateSettings] = useState({ dynamicRange: 0, hours: 0 })
  const [disabled, setdisabled] = useState(true)
  const [results, setresults] = useState<any | undefined>()
  const [loading, setloading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const disbaledBtn = Boolean(position && range?.start && range?.end)
    setdisabled(disbaledBtn)
  }, [range, position])

  function getSymbol(token: Token) {
    const currency = unwrappedToken(token)
    if (currency?.symbol === 'ETH') {
      return 'WETH'
    }
    return currency?.symbol
  }

  async function fetchBackTest({ position, bTType, range, gas, period, settings, ticks, fiatValue }: BackTestParams) {
    const poolAddress = findPoolAddress(position).toLowerCase()
    setloading(true)
    setError(false)
    const currency0 = getSymbol(position.pool.token0)
    const currency1 = getSymbol(position.pool.token1)
    const poolName = `${currency0}-${currency1}-${position.pool.fee * 0.0001}%`
    const dataFileName = `swap_results${poolAddress.slice(0, 5)}${range.start}${range.end}`
    let queryParams, btResultFile

    if (bTType === 'simple') {
      const results = formatSimpleParameters({
        range,
        gas,
        period,
        settings,
        ticks,
        fiatValue,
        poolName,
        dataFileName,
      })
      queryParams = results.queryParams
      btResultFile = results.btResultFile
    } else {
      const results = formatDynamicParameters({
        range,
        gas,
        period,
        settings,
        ticks,
        fiatValue,
        poolName,
        dataFileName,
      })
      queryParams = results.queryParams
      btResultFile = results.btResultFile
    }
    // return
    await initiateSwapsDownload(range.start, range.end, poolAddress)

    initiateBacktestResults(queryParams)
    const finalResults = await fetchFinalResults(btResultFile, poolName)
    if (finalResults) {
      setresults(finalResults)
    } else {
      setError(true)
    }
    setloading(false)
  }

  return (
    <Wrapper>
      <ResponsiveTwoColumns wide={true}>
        <AutoColumn gap={'md'}>
          <BTDateRange updateDateRange={(range) => updateRange(range)} />
        </AutoColumn>
        <AutoColumn gap={'md'}>
          <GasInput updateGas={(gas) => updateGas(gas)} />
        </AutoColumn>
      </ResponsiveTwoColumns>
      <TYPE.label>6. Backtest Type:</TYPE.label>
      <BTType
        updateBTType={(type: string) => {
          updateBTParentType(bTType)
          updateBTType(type)
        }}
      />
      {bTType === 'dynamic' && (
        <ResponsiveTwoColumns wide={true}>
          <AutoColumn gap={'md'}>
            <RebalancePeriod updateRebalancePeriod={(period) => updatePeriod(period)} />
          </AutoColumn>
          <AutoColumn>
            <RebalanceSettings
              updateSettings={(dynamicRange, hours) => updateSettings({ dynamicRange, hours })}
              currentPeriod={period}
            />
          </AutoColumn>
        </ResponsiveTwoColumns>
      )}
      {disabled && position !== undefined && !loading && (
        <FullBlock>
          <BTButton onClick={() => fetchBackTest({ position, bTType, range, gas, period, settings, ticks, fiatValue })}>
            <Trans>Backtest</Trans>
          </BTButton>
        </FullBlock>
      )}
      {loading && (
        <FullBlock>
          <Loader style={{ width: 40, height: 40 }} />
        </FullBlock>
      )}
      {results && !loading && (
        <div>
          <ResponsiveTwoColumns wide={true}>
            <AutoColumn>
              <LightCard padding="12px ">
                <Text>Capital Deployed: </Text>
                <Text>${Number(fiatValue).toFixed(0)}</Text>
                <Text>
                  {parseFloat(results.t0_in[0]).toFixed(4)}{' '}
                  {position?.pool?.token0 && getSymbol(position?.pool?.token0)}
                </Text>
                <Text>
                  {parseFloat(results.t1_in[0]).toFixed(4)}{' '}
                  {position?.pool?.token1 && getSymbol(position?.pool?.token1)}
                </Text>
              </LightCard>
            </AutoColumn>
            <AutoColumn>
              <LightCard padding="12px ">
                <Text>Return (USD): </Text>
                <Text>${Number(lastVal(results, 'PNL_USD_alt', 0))}</Text>
                <Text>APR Accrued: </Text>
                <Text>{Number(lastVal(results, 'APR_pool_alt', 0))}%</Text>
              </LightCard>
            </AutoColumn>
            <AutoColumn>
              <LightCard padding="12px ">
                <Text>Accrued: </Text>
                <Text>
                  {lastVal(results, 'fees_earned_t0_ac')} {position?.pool?.token0 && getSymbol(position?.pool?.token0)}
                </Text>
                <Text>
                  {lastVal(results, 'fees_earned_t1_ac')} {position?.pool?.token1 && getSymbol(position?.pool?.token1)}
                </Text>
              </LightCard>
            </AutoColumn>
            <AutoColumn>
              <LightCard padding="12px ">
                <Text>Impermanent Loss: </Text>
                <Text>${lastVal(results, 'IL_USD')}</Text>
              </LightCard>
            </AutoColumn>
            {bTType === 'dynamic' && (
              <AutoColumn>
                <LightCard padding="12px ">
                  <Text>Rebalances: </Text>
                  <Text>{sumObjectList('rebalancing', results)}</Text>
                </LightCard>
              </AutoColumn>
            )}
          </ResponsiveTwoColumns>
          {charts.map((chart) => (
            <ChartAndLabel
              key={chart.type}
              results={results}
              chartType={chart.type}
              label={chart.label}
              reducer={chart.reducer}
            />
          ))}
        </div>
      )}
      {error && <FullBlock>Ooops, something happened. Try running backtest again.</FullBlock>}
    </Wrapper>
  )
}
