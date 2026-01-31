// Complex number operations
export interface Complex {
  real: number;
  imag: number;
}

export const complex = {
  create: (real: number, imag: number): Complex => ({ real, imag }),
  
  fromPolar: (mag: number, phase: number): Complex => ({
    real: mag * Math.cos(phase),
    imag: mag * Math.sin(phase),
  }),
  
  magnitude: (c: Complex): number => Math.sqrt(c.real * c.real + c.imag * c.imag),
  
  phase: (c: Complex): number => Math.atan2(c.imag, c.real),
  
  add: (a: Complex, b: Complex): Complex => ({
    real: a.real + b.real,
    imag: a.imag + b.imag,
  }),
  
  subtract: (a: Complex, b: Complex): Complex => ({
    real: a.real - b.real,
    imag: a.imag - b.imag,
  }),
  
  multiply: (a: Complex, b: Complex): Complex => ({
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  }),
  
  divide: (a: Complex, b: Complex): Complex => {
    const denom = b.real * b.real + b.imag * b.imag;
    if (denom === 0) return { real: Infinity, imag: Infinity };
    return {
      real: (a.real * b.real + a.imag * b.imag) / denom,
      imag: (a.imag * b.real - a.real * b.imag) / denom,
    };
  },
  
  scale: (c: Complex, s: number): Complex => ({
    real: c.real * s,
    imag: c.imag * s,
  }),
};

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'bandstop';
export type FilterTopology = 'RC' | 'RL' | 'RLC' | 'butterworth' | 'chebyshev';

export interface FilterParams {
  type: FilterType;
  topology: FilterTopology;
  order: number;
  R: number; // Resistance in Ohms
  C: number; // Capacitance in Farads
  L: number; // Inductance in Henrys
  ripple?: number; // For Chebyshev filters (dB)
}

export interface FrequencyResponse {
  frequency: number;
  magnitude: number; // in dB
  phase: number; // in degrees
  magnitudeLinear: number;
}

export interface FilterCharacteristics {
  cutoffFrequency: number;
  resonantFrequency: number;
  qFactor: number;
  bandwidth: number;
  dampingFactor: number;
}

// Calculate cutoff frequency for different topologies
export function calculateCutoffFrequency(params: FilterParams): number {
  const { R, C, L, topology } = params;
  
  switch (topology) {
    case 'RC':
      return 1 / (2 * Math.PI * R * C);
    case 'RL':
      return R / (2 * Math.PI * L);
    case 'RLC':
    case 'butterworth':
    case 'chebyshev':
      return 1 / (2 * Math.PI * Math.sqrt(L * C));
    default:
      return 1 / (2 * Math.PI * R * C);
  }
}

// Calculate Q factor
export function calculateQFactor(params: FilterParams): number {
  const { R, C, L, topology } = params;
  
  switch (topology) {
    case 'RC':
    case 'RL':
      return 0.5; // First order filters have Q = 0.5
    case 'RLC':
    case 'butterworth':
    case 'chebyshev':
      // Q = (1/R) * sqrt(L/C)
      return (1 / R) * Math.sqrt(L / C);
    default:
      return 0.5;
  }
}

// Calculate bandwidth
export function calculateBandwidth(params: FilterParams): number {
  const fc = calculateCutoffFrequency(params);
  const Q = calculateQFactor(params);
  return fc / Q;
}

// Calculate damping factor
export function calculateDampingFactor(params: FilterParams): number {
  const Q = calculateQFactor(params);
  return 1 / (2 * Q);
}

// Get all filter characteristics
export function getFilterCharacteristics(params: FilterParams): FilterCharacteristics {
  return {
    cutoffFrequency: calculateCutoffFrequency(params),
    resonantFrequency: calculateCutoffFrequency(params),
    qFactor: calculateQFactor(params),
    bandwidth: calculateBandwidth(params),
    dampingFactor: calculateDampingFactor(params),
  };
}

// Calculate transfer function H(jω) for different filter types
export function calculateTransferFunction(
  params: FilterParams,
  omega: number
): Complex {
  const { type, topology, order, R, C, L } = params;
  const j = complex.create(0, 1);
  // Calculate omega_c (cutoff angular frequency)
  const _omega_c = 2 * Math.PI * calculateCutoffFrequency(params);
  void _omega_c; // Used for reference
  
  if (topology === 'RC' || topology === 'RL') {
    // First order filters
    const tau = topology === 'RC' ? R * C : L / R;
    const jwRC = complex.scale(j, omega * tau);
    
    if (type === 'lowpass') {
      // H(s) = 1 / (1 + sRC)
      const denom = complex.add(complex.create(1, 0), jwRC);
      let H = complex.divide(complex.create(1, 0), denom);
      
      // Apply order (cascade)
      for (let i = 1; i < order; i++) {
        H = complex.divide(H, denom);
      }
      return H;
    } else if (type === 'highpass') {
      // H(s) = sRC / (1 + sRC)
      const denom = complex.add(complex.create(1, 0), jwRC);
      let H = complex.divide(jwRC, denom);
      
      for (let i = 1; i < order; i++) {
        H = complex.multiply(H, complex.divide(jwRC, denom));
      }
      return H;
    }
  }
  
  if (topology === 'RLC' || topology === 'butterworth' || topology === 'chebyshev') {
    const omega_0 = 1 / Math.sqrt(L * C);
    const Q = calculateQFactor(params);
    
    // s = jω
    const s = complex.scale(j, omega);
    const s2 = complex.multiply(s, s);
    
    if (type === 'lowpass') {
      // H(s) = ω₀² / (s² + (ω₀/Q)s + ω₀²)
      const omega_0_sq = omega_0 * omega_0;
      const coeff = omega_0 / Q;
      
      const term1 = s2;
      const term2 = complex.scale(s, coeff);
      const term3 = complex.create(omega_0_sq, 0);
      
      const denom = complex.add(complex.add(term1, term2), term3);
      let H = complex.divide(complex.create(omega_0_sq, 0), denom);
      
      // Apply higher orders (cascade stages)
      for (let i = 2; i < order; i += 2) {
        H = complex.multiply(H, complex.divide(complex.create(omega_0_sq, 0), denom));
      }
      
      return H;
    } else if (type === 'highpass') {
      // H(s) = s² / (s² + (ω₀/Q)s + ω₀²)
      const omega_0_sq = omega_0 * omega_0;
      const coeff = omega_0 / Q;
      
      const term1 = s2;
      const term2 = complex.scale(s, coeff);
      const term3 = complex.create(omega_0_sq, 0);
      
      const denom = complex.add(complex.add(term1, term2), term3);
      let H = complex.divide(s2, denom);
      
      for (let i = 2; i < order; i += 2) {
        H = complex.multiply(H, complex.divide(s2, denom));
      }
      
      return H;
    } else if (type === 'bandpass') {
      // H(s) = (ω₀/Q)s / (s² + (ω₀/Q)s + ω₀²)
      const omega_0_sq = omega_0 * omega_0;
      const coeff = omega_0 / Q;
      
      const num = complex.scale(s, coeff);
      const term1 = s2;
      const term2 = complex.scale(s, coeff);
      const term3 = complex.create(omega_0_sq, 0);
      
      const denom = complex.add(complex.add(term1, term2), term3);
      return complex.divide(num, denom);
    } else if (type === 'bandstop') {
      // H(s) = (s² + ω₀²) / (s² + (ω₀/Q)s + ω₀²)
      const omega_0_sq = omega_0 * omega_0;
      const coeff = omega_0 / Q;
      
      const num = complex.add(s2, complex.create(omega_0_sq, 0));
      const term1 = s2;
      const term2 = complex.scale(s, coeff);
      const term3 = complex.create(omega_0_sq, 0);
      
      const denom = complex.add(complex.add(term1, term2), term3);
      return complex.divide(num, denom);
    }
  }
  
  return complex.create(1, 0);
}

// Generate frequency response data
export function generateFrequencyResponse(
  params: FilterParams,
  startFreq: number = 1,
  endFreq: number = 1e6,
  numPoints: number = 500
): FrequencyResponse[] {
  const response: FrequencyResponse[] = [];
  
  const logStart = Math.log10(startFreq);
  const logEnd = Math.log10(endFreq);
  const logStep = (logEnd - logStart) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const freq = Math.pow(10, logStart + i * logStep);
    const omega = 2 * Math.PI * freq;
    
    const H = calculateTransferFunction(params, omega);
    const mag = complex.magnitude(H);
    const ph = complex.phase(H);
    
    response.push({
      frequency: freq,
      magnitude: 20 * Math.log10(Math.max(mag, 1e-10)),
      phase: (ph * 180) / Math.PI,
      magnitudeLinear: mag,
    });
  }
  
  return response;
}

// Generate Q factor vs frequency data
export function generateQFactorVsFrequency(
  params: FilterParams,
  startFreq: number = 1,
  endFreq: number = 1e6,
  numPoints: number = 200
): { frequency: number; qFactor: number; energyStored: number; energyDissipated: number }[] {
  const data: { frequency: number; qFactor: number; energyStored: number; energyDissipated: number }[] = [];
  const { R, C, L } = params;
  
  const logStart = Math.log10(startFreq);
  const logEnd = Math.log10(endFreq);
  const logStep = (logEnd - logStart) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const freq = Math.pow(10, logStart + i * logStep);
    const omega = 2 * Math.PI * freq;
    
    // Q factor varies with frequency for RLC circuits
    // Q = ω₀L/R at resonance, but varies with frequency
    const X_L = omega * L; // Inductive reactance
    const X_C = 1 / (omega * C); // Capacitive reactance
    
    // Energy stored in reactive components
    const energyStored = Math.abs(X_L - X_C);
    const energyDissipated = R;
    
    const qFactor = energyStored / (2 * R);
    
    data.push({
      frequency: freq,
      qFactor: Math.max(qFactor, 0.01),
      energyStored,
      energyDissipated,
    });
  }
  
  return data;
}

// Generate step response
export function generateStepResponse(
  params: FilterParams,
  duration: number = 0.01,
  numPoints: number = 500
): { time: number; amplitude: number }[] {
  const data: { time: number; amplitude: number }[] = [];
  const { R, C, L, topology } = params;
  const dt = duration / numPoints;
  
  if (topology === 'RC') {
    const tau = R * C;
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      const amplitude = 1 - Math.exp(-t / tau);
      data.push({ time: t * 1000, amplitude }); // Convert to ms
    }
  } else if (topology === 'RLC' || topology === 'butterworth') {
    const omega_0 = 1 / Math.sqrt(L * C);
    const alpha = R / (2 * L);
    const Q = calculateQFactor(params);
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      let amplitude: number;
      
      if (Q > 0.5) {
        // Underdamped
        const omega_d = omega_0 * Math.sqrt(1 - 1 / (4 * Q * Q));
        amplitude = 1 - Math.exp(-alpha * t) * (Math.cos(omega_d * t) + (alpha / omega_d) * Math.sin(omega_d * t));
      } else if (Q === 0.5) {
        // Critically damped
        amplitude = 1 - (1 + alpha * t) * Math.exp(-alpha * t);
      } else {
        // Overdamped
        const s1 = -alpha + Math.sqrt(alpha * alpha - omega_0 * omega_0);
        const s2 = -alpha - Math.sqrt(alpha * alpha - omega_0 * omega_0);
        amplitude = 1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2);
      }
      
      data.push({ time: t * 1000, amplitude: Math.max(0, Math.min(2, amplitude)) });
    }
  } else {
    // Default: simple exponential
    const tau = R * C || 0.001;
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      const amplitude = 1 - Math.exp(-t / tau);
      data.push({ time: t * 1000, amplitude });
    }
  }
  
  return data;
}

// Generate impulse response
export function generateImpulseResponse(
  params: FilterParams,
  duration: number = 0.01,
  numPoints: number = 500
): { time: number; amplitude: number }[] {
  const data: { time: number; amplitude: number }[] = [];
  const { R, C, L, topology } = params;
  const dt = duration / numPoints;
  
  if (topology === 'RC') {
    const tau = R * C;
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      const amplitude = (1 / tau) * Math.exp(-t / tau);
      data.push({ time: t * 1000, amplitude: amplitude * tau }); // Normalize
    }
  } else if (topology === 'RLC' || topology === 'butterworth') {
    const omega_0 = 1 / Math.sqrt(L * C);
    const alpha = R / (2 * L);
    const Q = calculateQFactor(params);
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      let amplitude: number;
      
      if (Q > 0.5) {
        // Underdamped
        const omega_d = omega_0 * Math.sqrt(1 - 1 / (4 * Q * Q));
        amplitude = (omega_0 / omega_d) * Math.exp(-alpha * t) * Math.sin(omega_d * t);
      } else {
        // Overdamped or critically damped
        amplitude = omega_0 * t * Math.exp(-alpha * t);
      }
      
      data.push({ time: t * 1000, amplitude });
    }
  } else {
    const tau = R * C || 0.001;
    for (let i = 0; i <= numPoints; i++) {
      const t = i * dt;
      const amplitude = Math.exp(-t / tau);
      data.push({ time: t * 1000, amplitude });
    }
  }
  
  return data;
}

// Generate pole-zero data for visualization
export function generatePoleZeroData(params: FilterParams): {
  poles: Complex[];
  zeros: Complex[];
} {
  const { type, R, C, L, topology } = params;
  const poles: Complex[] = [];
  const zeros: Complex[] = [];
  
  if (topology === 'RC' || topology === 'RL') {
    const tau = topology === 'RC' ? R * C : L / R;
    poles.push(complex.create(-1 / tau, 0));
    
    if (type === 'highpass') {
      zeros.push(complex.create(0, 0));
    }
  } else if (topology === 'RLC' || topology === 'butterworth') {
    const omega_0 = 1 / Math.sqrt(L * C);
    const alpha = R / (2 * L);
    const Q = calculateQFactor(params);
    
    if (Q > 0.5) {
      // Complex conjugate poles
      const omega_d = omega_0 * Math.sqrt(1 - 1 / (4 * Q * Q));
      poles.push(complex.create(-alpha, omega_d));
      poles.push(complex.create(-alpha, -omega_d));
    } else {
      // Real poles
      const discriminant = alpha * alpha - omega_0 * omega_0;
      poles.push(complex.create(-alpha + Math.sqrt(discriminant), 0));
      poles.push(complex.create(-alpha - Math.sqrt(discriminant), 0));
    }
    
    if (type === 'highpass') {
      zeros.push(complex.create(0, 0));
      zeros.push(complex.create(0, 0));
    } else if (type === 'bandstop') {
      zeros.push(complex.create(0, omega_0));
      zeros.push(complex.create(0, -omega_0));
    }
  }
  
  return { poles, zeros };
}

// Format frequency for display
export function formatFrequency(freq: number): string {
  if (freq >= 1e9) return `${(freq / 1e9).toFixed(2)} GHz`;
  if (freq >= 1e6) return `${(freq / 1e6).toFixed(2)} MHz`;
  if (freq >= 1e3) return `${(freq / 1e3).toFixed(2)} kHz`;
  return `${freq.toFixed(2)} Hz`;
}

// Format component value
export function formatComponentValue(value: number, unit: string): string {
  if (value >= 1) return `${value.toFixed(3)} ${unit}`;
  if (value >= 1e-3) return `${(value * 1e3).toFixed(3)} m${unit}`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(3)} µ${unit}`;
  if (value >= 1e-9) return `${(value * 1e9).toFixed(3)} n${unit}`;
  if (value >= 1e-12) return `${(value * 1e12).toFixed(3)} p${unit}`;
  return `${value.toExponential(2)} ${unit}`;
}
