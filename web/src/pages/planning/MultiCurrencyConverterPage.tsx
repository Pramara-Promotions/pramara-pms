import { useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useProjectContext } from '../../hooks';
import {
    DollarSign,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Globe,
    AlertCircle,
    Calculator
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExchangeRate {
    currency: string;
    rate: number;
    change24h: number;
    symbol: string;
}

interface ConversionHistory {
    timestamp: string;
    from: string;
    to: string;
    amount: number;
    result: number;
    rate: number;
}

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }
];

export default function MultiCurrencyConverterPage() {
    const { projectId } = useProjectContext();

    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [targetCurrency, setTargetCurrency] = useState('EUR');
    const [amount, setAmount] = useState<number>(1000);
    const [convertedAmount, setConvertedAmount] = useState<number>(0);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
        { currency: 'EUR', rate: 0.92, change24h: -0.15, symbol: '€' },
        { currency: 'GBP', rate: 0.79, change24h: 0.23, symbol: '£' },
        { currency: 'JPY', rate: 149.50, change24h: -0.45, symbol: '¥' },
        { currency: 'CNY', rate: 7.24, change24h: 0.08, symbol: '¥' },
        { currency: 'INR', rate: 83.12, change24h: -0.12, symbol: '₹' },
        { currency: 'AUD', rate: 1.52, change24h: 0.34, symbol: 'A$' },
        { currency: 'CAD', rate: 1.36, change24h: 0.18, symbol: 'C$' },
        { currency: 'CHF', rate: 0.88, change24h: -0.09, symbol: 'Fr' },
        { currency: 'SGD', rate: 1.34, change24h: 0.11, symbol: 'S$' }
    ]);
    const [history, setHistory] = useState<ConversionHistory[]>([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Simulated historical data for trend chart
    const [historicalData, setHistoricalData] = useState<Array<{ date: string; rate: number }>>(() => {
        const data: Array<{ date: string; rate: number }> = [];
        const baseRate = 0.92;
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rate: baseRate + (Math.random() - 0.5) * 0.05
            });
        }
        return data;
    });

    useEffect(() => {
        performConversion();
    }, [amount, baseCurrency, targetCurrency]);

    const performConversion = () => {
        let rate = 1;

        if (baseCurrency === 'USD' && targetCurrency !== 'USD') {
            const targetRate = exchangeRates.find(r => r.currency === targetCurrency);
            rate = targetRate?.rate || 1;
        } else if (baseCurrency !== 'USD' && targetCurrency === 'USD') {
            const baseRate = exchangeRates.find(r => r.currency === baseCurrency);
            rate = baseRate ? 1 / baseRate.rate : 1;
        } else if (baseCurrency !== 'USD' && targetCurrency !== 'USD') {
            const baseRate = exchangeRates.find(r => r.currency === baseCurrency);
            const targetRate = exchangeRates.find(r => r.currency === targetCurrency);
            if (baseRate && targetRate) {
                rate = targetRate.rate / baseRate.rate;
            }
        }

        const result = amount * rate;
        setConvertedAmount(result);

        // Add to history
        const newEntry: ConversionHistory = {
            timestamp: new Date().toISOString(),
            from: baseCurrency,
            to: targetCurrency,
            amount,
            result,
            rate
        };

        setHistory(prev => [newEntry, ...prev.slice(0, 9)]);
    };

    const refreshRates = () => {
        // Simulate rate refresh with small random changes
        setExchangeRates(prev => prev.map(rate => ({
            ...rate,
            rate: rate.rate * (1 + (Math.random() - 0.5) * 0.01),
            change24h: (Math.random() - 0.5) * 0.5
        })));
        setLastUpdated(new Date());
    };

    const swapCurrencies = () => {
        setBaseCurrency(targetCurrency);
        setTargetCurrency(baseCurrency);
    };

    const getSymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || code;
    };

    if (!projectId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-medium text-yellow-900">No Project Context</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Navigate to a project to use the currency converter.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <PageHeader title="Multi-Currency Converter" />

                {/* Main Converter Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Calculator className="w-5 h-5" />
                            Currency Converter
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                            <button
                                onClick={refreshRates}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh Rates
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* From Currency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                From
                            </label>
                            <select
                                value={baseCurrency}
                                onChange={(e) => setBaseCurrency(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                            >
                                {CURRENCIES.map(curr => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.symbol} {curr.code} - {curr.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Swap Button */}
                        <div className="flex items-end justify-center pb-3">
                            <button
                                onClick={swapCurrencies}
                                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                title="Swap currencies"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* To Currency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                To
                            </label>
                            <select
                                value={targetCurrency}
                                onChange={(e) => setTargetCurrency(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                            >
                                {CURRENCIES.map(curr => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.symbol} {curr.code} - {curr.name}
                                    </option>
                                ))}
                            </select>
                            <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-lg font-bold text-gray-900">
                                {getSymbol(targetCurrency)} {convertedAmount.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>1 {baseCurrency}</strong> = <strong>{(convertedAmount / amount).toFixed(6)} {targetCurrency}</strong>
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                            Mid-market exchange rate
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Exchange Rates Table */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Live Exchange Rates (Base: USD)
                        </h3>

                        <div className="space-y-2">
                            {exchangeRates.map((rate) => (
                                <div
                                    key={rate.currency}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-semibold">{rate.symbol}</span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{rate.currency}</div>
                                            <div className="text-sm text-gray-500">
                                                {CURRENCIES.find(c => c.code === rate.currency)?.name}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">{rate.rate.toFixed(4)}</div>
                                        <div className={`text-sm flex items-center gap-1 ${rate.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {rate.change24h >= 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {Math.abs(rate.change24h).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Conversion History */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion History</h3>

                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                <p>No conversions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm font-medium text-gray-900">
                                                {getSymbol(entry.from)} {entry.amount.toFixed(2)} {entry.from} → {getSymbol(entry.to)} {entry.result.toFixed(2)} {entry.to}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(entry.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Rate: 1 {entry.from} = {entry.rate.toFixed(6)} {entry.to}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Historical Trend Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        30-Day Exchange Rate Trend ({baseCurrency}/{targetCurrency})
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={historicalData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={['dataMin - 0.02', 'dataMax + 0.02']} />
                            <Tooltip formatter={(value: number) => value.toFixed(4)} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                name="Exchange Rate"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Quick Convert Buttons */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Convert</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[100, 500, 1000, 5000, 10000, 50000].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                {getSymbol(baseCurrency)} {val.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
