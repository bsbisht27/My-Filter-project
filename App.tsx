import { useState, useMemo } from 'react';
import { BodePlot } from './components/BodePlot';
import { QFactorPlot } from './components/QFactorPlot';
import { TimeResponsePlot } from './components/TimeResponsePlot';
import { PoleZeroPlot } from './components/PoleZeroPlot';
import {
  FilterParams,
  FilterType,
  FilterTopology,
  generateFrequencyResponse,
  generateQFactorVsFrequency,
  generateStepResponse,
  generateImpulseResponse,
  generatePoleZeroData,
  getFilterCharacteristics,
  formatFrequency,
  formatComponentValue,
} from './utils/filterCalculations';

export function App() {
  const [filterType, setFilterType] = useState<FilterType>('lowpass');
  const [topology, setTopology] = useState<FilterTopology>('RLC');
  const [order, setOrder] = useState(2);
  const [resistance, setResistance] = useState(1000); // Ohms
  const [capacitance, setCapacitance] = useState(0.000001); // 1µF
  const [inductance, setInductance] = useState(0.01); // 10mH
  const [freqStart, setFreqStart] = useState(10);
  const [freqEnd, setFreqEnd] = useState(100000);
  const [activeTab, setActiveTab] = useState<'bode' | 'qfactor' | 'time' | 'polezero'>('bode');

  const filterParams: FilterParams = useMemo(() => ({
    type: filterType,
    topology,
    order,
    R: resistance,
    C: capacitance,
    L: inductance,
  }), [filterType, topology, order, resistance, capacitance, inductance]);

  const frequencyResponse = useMemo(() => 
    generateFrequencyResponse(filterParams, freqStart, freqEnd),
    [filterParams, freqStart, freqEnd]
  );

  const qFactorData = useMemo(() => 
    generateQFactorVsFrequency(filterParams, freqStart, freqEnd),
    [filterParams, freqStart, freqEnd]
  );

  const characteristics = useMemo(() => 
    getFilterCharacteristics(filterParams),
    [filterParams]
  );

  const stepResponse = useMemo(() => {
    const period = 1 / characteristics.cutoffFrequency;
    return generateStepResponse(filterParams, period * 5);
  }, [filterParams, characteristics.cutoffFrequency]);

  const impulseResponse = useMemo(() => {
    const period = 1 / characteristics.cutoffFrequency;
    return generateImpulseResponse(filterParams, period * 5);
  }, [filterParams, characteristics.cutoffFrequency]);

  const poleZeroData = useMemo(() => 
    generatePoleZeroData(filterParams),
    [filterParams]
  );

  const topologies: { value: FilterTopology; label: string; description: string }[] = [
    { value: 'RC', label: 'RC (1st Order)', description: 'Simple RC filter' },
    { value: 'RL', label: 'RL (1st Order)', description: 'Simple RL filter' },
    { value: 'RLC', label: 'RLC (2nd Order)', description: 'Second-order RLC filter' },
    { value: 'butterworth', label: 'Butterworth', description: 'Maximally flat response' },
    { value: 'chebyshev', label: 'Chebyshev', description: 'Steeper rolloff with ripple' },
  ];

  const filterTypes: { value: FilterType; label: string }[] = [
    { value: 'lowpass', label: 'Low-Pass' },
    { value: 'highpass', label: 'High-Pass' },
    { value: 'bandpass', label: 'Band-Pass' },
    { value: 'bandstop', label: 'Band-Stop (Notch)' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Filter Analysis Tool</h1>
              <p className="text-slate-400 text-sm">Bode Plot, Q Factor & Transfer Characteristics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filter Type */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-blue-400">Filter Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {filterTypes.map(ft => (
                  <button
                    key={ft.value}
                    onClick={() => setFilterType(ft.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterType === ft.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topology */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-purple-400">Topology</h3>
              <select
                value={topology}
                onChange={(e) => setTopology(e.target.value as FilterTopology)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                {topologies.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-slate-400 text-xs mt-2">
                {topologies.find(t => t.value === topology)?.description}
              </p>
            </div>

            {/* Filter Order */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-green-400">Filter Order</h3>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-2xl font-bold text-green-400 w-8 text-center">{order}</span>
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Rolloff: {order * 20} dB/decade
              </p>
            </div>

            {/* Component Values */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-amber-400">Component Values</h3>
              
              <div className="space-y-4">
                {/* Resistance */}
                <div>
                  <label className="text-sm text-slate-300 flex justify-between">
                    <span>Resistance (R)</span>
                    <span className="text-amber-400">{formatComponentValue(resistance, 'Ω')}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.1"
                    value={Math.log10(resistance)}
                    onChange={(e) => setResistance(Math.pow(10, parseFloat(e.target.value)))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>10Ω</span>
                    <span>10kΩ</span>
                  </div>
                </div>

                {/* Capacitance */}
                <div>
                  <label className="text-sm text-slate-300 flex justify-between">
                    <span>Capacitance (C)</span>
                    <span className="text-cyan-400">{formatComponentValue(capacitance, 'F')}</span>
                  </label>
                  <input
                    type="range"
                    min="-9"
                    max="-3"
                    step="0.1"
                    value={Math.log10(capacitance)}
                    onChange={(e) => setCapacitance(Math.pow(10, parseFloat(e.target.value)))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1nF</span>
                    <span>1mF</span>
                  </div>
                </div>

                {/* Inductance */}
                <div>
                  <label className="text-sm text-slate-300 flex justify-between">
                    <span>Inductance (L)</span>
                    <span className="text-rose-400">{formatComponentValue(inductance, 'H')}</span>
                  </label>
                  <input
                    type="range"
                    min="-6"
                    max="0"
                    step="0.1"
                    value={Math.log10(inductance)}
                    onChange={(e) => setInductance(Math.pow(10, parseFloat(e.target.value)))}
                    className="w-full accent-rose-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1µH</span>
                    <span>1H</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequency Range */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-pink-400">Frequency Range</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-300">Start Frequency</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={freqStart}
                      onChange={(e) => setFreqStart(Math.max(0.1, parseFloat(e.target.value) || 1))}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                    <span className="text-slate-400 self-center text-sm">Hz</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">End Frequency</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={freqEnd}
                      onChange={(e) => setFreqEnd(Math.max(freqStart * 10, parseFloat(e.target.value) || 1000))}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                    <span className="text-slate-400 self-center text-sm">Hz</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Characteristics Display */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-semibold mb-3 text-emerald-400">Filter Characteristics</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cutoff Frequency (fc)</span>
                  <span className="text-emerald-400 font-mono">{formatFrequency(characteristics.cutoffFrequency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Q Factor</span>
                  <span className="text-purple-400 font-mono">{characteristics.qFactor.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bandwidth</span>
                  <span className="text-blue-400 font-mono">{formatFrequency(characteristics.bandwidth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Damping Factor (ζ)</span>
                  <span className="text-amber-400 font-mono">{characteristics.dampingFactor.toFixed(3)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-slate-400 text-xs">
                    {characteristics.dampingFactor < 1 ? '⚡ Underdamped (oscillatory)' :
                     characteristics.dampingFactor === 1 ? '✓ Critically damped' :
                     '🔋 Overdamped'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Plots Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'bode', label: 'Bode Plot', icon: '📊' },
                { id: 'qfactor', label: 'Q Factor', icon: '⚡' },
                { id: 'time', label: 'Time Response', icon: '📈' },
                { id: 'polezero', label: 'Pole-Zero', icon: '🎯' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Plot */}
            <div className="min-h-[600px]">
              {activeTab === 'bode' && (
                <BodePlot
                  data={frequencyResponse}
                  cutoffFrequency={characteristics.cutoffFrequency}
                  title={`${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Filter - Bode Plot`}
                />
              )}
              
              {activeTab === 'qfactor' && (
                <QFactorPlot
                  data={qFactorData}
                  resonantFrequency={characteristics.resonantFrequency}
                  peakQ={characteristics.qFactor}
                />
              )}
              
              {activeTab === 'time' && (
                <TimeResponsePlot
                  stepResponse={stepResponse}
                  impulseResponse={impulseResponse}
                  title="Time Domain Response"
                />
              )}
              
              {activeTab === 'polezero' && (
                <PoleZeroPlot
                  poles={poleZeroData.poles}
                  zeros={poleZeroData.zeros}
                />
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm text-slate-400 mb-1">Transfer Function</h4>
                <p className="text-white font-mono text-sm">
                  {topology === 'RC' || topology === 'RL' ? (
                    filterType === 'lowpass' ? 'H(s) = 1/(1 + sτ)' : 'H(s) = sτ/(1 + sτ)'
                  ) : (
                    filterType === 'lowpass' ? 'H(s) = ω₀²/(s² + (ω₀/Q)s + ω₀²)' :
                    filterType === 'highpass' ? 'H(s) = s²/(s² + (ω₀/Q)s + ω₀²)' :
                    filterType === 'bandpass' ? 'H(s) = (ω₀/Q)s/(s² + (ω₀/Q)s + ω₀²)' :
                    'H(s) = (s² + ω₀²)/(s² + (ω₀/Q)s + ω₀²)'
                  )}
                </p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm text-slate-400 mb-1">Angular Frequency</h4>
                <p className="text-white font-mono text-sm">
                  ω₀ = {(2 * Math.PI * characteristics.cutoffFrequency).toExponential(3)} rad/s
                </p>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm text-slate-400 mb-1">Time Constant</h4>
                <p className="text-white font-mono text-sm">
                  τ = {(1 / (2 * Math.PI * characteristics.cutoffFrequency) * 1000).toFixed(4)} ms
                </p>
              </div>
            </div>

            {/* Theory Reference */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Quick Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                <div>
                  <p><strong className="text-slate-300">Q Factor:</strong> Quality factor measures the sharpness of the resonance peak. Higher Q = narrower bandwidth.</p>
                  <p className="mt-1"><strong className="text-slate-300">Damping:</strong> ζ = 1/(2Q). ζ &lt; 1: underdamped, ζ = 1: critically damped, ζ &gt; 1: overdamped.</p>
                </div>
                <div>
                  <p><strong className="text-slate-300">-3dB Point:</strong> The frequency where magnitude drops to 70.7% (half power point).</p>
                  <p className="mt-1"><strong className="text-slate-300">Phase:</strong> 1st order: -45° at fc, 2nd order: -90° at fc.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
