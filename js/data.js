/**
 * Solfeggio Sanctuary — Frequency & Binaural Data
 * All frequencies use their TRUE fundamental tuning (NOT 440Hz)
 */

export const SOLFEGGIO_FREQUENCIES = [
    {
        hz: 174,
        name: 'Foundation',
        nameUa: 'Основа',
        description: 'Знеболення, заземлення, зняття напруги',
        color: '#FF6B6B',
        colorRgb: '255, 107, 107',
        icon: '🌍'
    },
    {
        hz: 285,
        name: 'Restoration',
        nameUa: 'Відновлення',
        description: 'Регенерація тканин, клітинне відновлення',
        color: '#FF8E53',
        colorRgb: '255, 142, 83',
        icon: '🔄'
    },
    {
        hz: 396,
        name: 'Liberation',
        nameUa: 'Звільнення',
        description: 'Звільнення від страху та провини',
        color: '#FFC857',
        colorRgb: '255, 200, 87',
        icon: '🕊️'
    },
    {
        hz: 417,
        name: 'Transformation',
        nameUa: 'Трансформація',
        description: 'Очищення негативної енергії, зміни',
        color: '#A8E06C',
        colorRgb: '168, 224, 108',
        icon: '🦋'
    },
    {
        hz: 528,
        name: 'Miracle',
        nameUa: 'Диво',
        description: 'Частота любові та трансформації',
        color: '#6BCB77',
        colorRgb: '107, 203, 119',
        icon: '💚'
    },
    {
        hz: 639,
        name: 'Connection',
        nameUa: 'Зв\'язок',
        description: 'Гармонія стосунків, комунікація',
        color: '#4ECDC4',
        colorRgb: '78, 205, 196',
        icon: '🤝'
    },
    {
        hz: 741,
        name: 'Expression',
        nameUa: 'Вираження',
        description: 'Детоксикація, пробудження самовираження',
        color: '#45B7D1',
        colorRgb: '69, 183, 209',
        icon: '💎'
    },
    {
        hz: 852,
        name: 'Intuition',
        nameUa: 'Інтуїція',
        description: 'Пробудження інтуїції, духовна ясність',
        color: '#7C5CFC',
        colorRgb: '124, 92, 252',
        icon: '👁️'
    },
    {
        hz: 963,
        name: 'Divine',
        nameUa: 'Божественне',
        description: 'Зв\'язок з вищим Я, шишковидна залоза',
        color: '#C77DFF',
        colorRgb: '199, 125, 255',
        icon: '✨'
    }
];

export const BINAURAL_BEATS = [
    {
        name: 'Delta',
        beatHz: 2,
        description: 'Глибокий сон, зцілення',
        state: 'Глибокий відпочинок',
        color: '#4A5568'
    },
    {
        name: 'Theta',
        beatHz: 6,
        description: 'Медитація, креативність',
        state: 'Глибока медитація',
        color: '#6B46C1'
    },
    {
        name: 'Alpha',
        beatHz: 10,
        description: 'Спокійна зосередженість',
        state: 'Релаксація',
        color: '#3182CE'
    },
    {
        name: 'Beta',
        beatHz: 20,
        description: 'Активна концентрація',
        state: 'Фокус',
        color: '#38A169'
    },
    {
        name: 'Gamma',
        beatHz: 40,
        description: 'Пікова усвідомленість',
        state: 'Ясність розуму',
        color: '#D69E2E'
    }
];

export const TIMER_OPTIONS = [
    { label: '15 хв', minutes: 15 },
    { label: '30 хв', minutes: 30 },
    { label: '1 год', minutes: 60 },
    { label: '∞', minutes: 0 }
];

/* Synthesis config — harmonics built from the Solfeggio fundamental */
export const SYNTH_CONFIG = {
    harmonicGains: [1.0, 0.3, 0.15, 0.08, 0.04],   // fundamental + 4 harmonics
    subBassGain: 0.2,                                 // 0.5x frequency
    noiseGain: 0.03,                                  // filtered noise texture
    lfoRate: 0.08,                                    // Hz — slow evolution
    lfoDepth: 200,                                    // filter modulation depth
    reverbDuration: 3.5,                              // seconds
    reverbDecay: 2.5,                                 // decay curve
    crossfadeDuration: 3,                             // seconds
    fadeOutDuration: 10,                              // timer end fade
    filterBaseFreq: 800,                              // lowpass base cutoff
    masterGain: 0.7,                                  // default volume
    wetDryMix: 0.3                                    // reverb wet amount
};
