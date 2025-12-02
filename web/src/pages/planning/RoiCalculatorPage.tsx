import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useProjectContext } from '../../hooks';
import {
    Calculator,
    TrendingUp,
    DollarSign,
    Calendar,
    AlertCircle,
    CheckCircle,
    PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function RoiCalculatorPage() {
    const { projectId } = useProjectContext();

    const [investment, setInvestment] = useState({
        newMachines: 50000,
        training: 5000,
        installation: 3000,
        software: 2000
    });

    const [benefits, setBenefits] = useState({
        monthlyRevenue: 15000,
        costSavings: 3000,
        efficiencyGain: 20
    });

    const [timeframe, setTimeframe] = useState(24); // months

    const totalInvestment = Object.values(investment).reduce((sum, val) => sum + val, 0);
    const monthlyBenefits = benefits.monthlyRevenue + benefits.costSavings;
    const cumulativeBenefits = monthlyBenefits * timeframe;
    const netProfit = cumulativeBenefits - totalInvestment;
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const paybackMonths = monthlyBenefits > 0 ? Math.ceil(totalInvestment / monthlyBenefits) : 0;

    // Investment breakdown
    const investmentData = [
        { name: 'Machines', value: investment.newMachines },
        { name: 'Training', value: investment.training },
        { name: 'Installation', value: investment.installation },
        { name: 'Software', value: investment.software }
    ].filter(item => item.value > 0);

    // Cumulative cash flow over time
    const cashFlowData = Array.from({ length: Math.min(timeframe, 36) }, (_, i) => {
        const month = i + 1;
        const totalBenefits = monthlyBenefits * month;
        const netCashFlow = totalBenefits - totalInvestment;
        return {
            month,
            cumulative: netCashFlow,
            breakeven: 0
        };
    });

    if (!projectId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-medium text-yellow-900">No Project Context</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Navigate to a project to calculate ROI.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <PageHeader title="ROI Calculator" />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm">Total Investment</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            ${totalInvestment.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">ROI</span>
                        </div>
                        <div className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {roi.toFixed(1)}%
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">Payback Period</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {paybackMonths} mo
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Net Profit</span>
                        </div>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(netProfit).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="space-y-6">
                        {/* Investment Inputs */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Initial Investment
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Machines
                                    </label>
                                    <input
                                        type="number"
                                        value={investment.newMachines}
                                        onChange={(e) => setInvestment({ ...investment, newMachines: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Training Costs
                                    </label>
                                    <input
                                        type="number"
                                        value={investment.training}
                                        onChange={(e) => setInvestment({ ...investment, training: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Installation
                                    </label>
                                    <input
                                        type="number"
                                        value={investment.installation}
                                        onChange={(e) => setInvestment({ ...investment, installation: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Software/Systems
                                    </label>
                                    <input
                                        type="number"
                                        value={investment.software}
                                        onChange={(e) => setInvestment({ ...investment, software: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Benefits Inputs */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Expected Benefits
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Revenue Increase
                                    </label>
                                    <input
                                        type="number"
                                        value={benefits.monthlyRevenue}
                                        onChange={(e) => setBenefits({ ...benefits, monthlyRevenue: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Cost Savings
                                    </label>
                                    <input
                                        type="number"
                                        value={benefits.costSavings}
                                        onChange={(e) => setBenefits({ ...benefits, costSavings: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Efficiency Gain (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={benefits.efficiencyGain}
                                        onChange={(e) => setBenefits({ ...benefits, efficiencyGain: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        max="100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Timeframe (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={timeframe}
                                        onChange={(e) => setTimeframe(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                        max="60"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visualization Section */}
                    <div className="space-y-6">
                        {/* Investment Breakdown */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Breakdown</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={investmentData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(props: any) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {investmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Cash Flow Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Cash Flow</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={cashFlowData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -5 }} />
                                    <YAxis label={{ value: 'Net Cash Flow ($)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} name="Net Cash Flow" />
                                    <Line type="monotone" dataKey="breakeven" stroke="#ef4444" strokeDasharray="5 5" name="Break-even" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Recommendation */}
                        <div className={`border-2 rounded-lg p-4 ${roi >= 20 ? 'bg-green-50 border-green-200' : roi >= 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                            }`}>
                            <div className="flex items-start gap-3">
                                {roi >= 20 ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : roi >= 0 ? (
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                    <h4 className={`font-semibold ${roi >= 20 ? 'text-green-900' : roi >= 0 ? 'text-yellow-900' : 'text-red-900'
                                        }`}>
                                        {roi >= 20 ? 'Strong Investment' : roi >= 0 ? 'Moderate Investment' : 'Risky Investment'}
                                    </h4>
                                    <p className={`text-sm mt-1 ${roi >= 20 ? 'text-green-700' : roi >= 0 ? 'text-yellow-700' : 'text-red-700'
                                        }`}>
                                        {roi >= 20
                                            ? `Excellent ROI of ${roi.toFixed(1)}%. Investment will pay back in ${paybackMonths} months.`
                                            : roi >= 0
                                                ? `Positive ROI of ${roi.toFixed(1)}%, but payback period is ${paybackMonths} months. Consider optimizing costs.`
                                                : `Negative ROI of ${roi.toFixed(1)}%. Current projections show a loss of $${Math.abs(netProfit).toLocaleString()}. Reconsider parameters.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
