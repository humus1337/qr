export type ContentType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard';

export type ColorMode = 'solid' | 'linear' | 'radial';
export type DotStyle = 'square' | 'rounded' | 'dots' | 'fluid' | 'diamond' | 'leaf' | 'bars';
export type EyeFrameStyle = 'square' | 'rounded' | 'extra' | 'circle' | 'leaf';
export type EyePupilStyle = 'square' | 'rounded' | 'dot' | 'leaf' | 'diamond';
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface ColorOptions {
  mode?: ColorMode;
  c1?: string;
  c2?: string;
  angle?: number;
}

export interface BackgroundOptions {
  color?: string;
  transparent?: boolean;
}

export interface EyeOptions {
  custom?: boolean;
  frame?: string;
  pupil?: string;
}

export interface FrameOptions {
  style?: 'none' | 'bottom' | 'top';
  text?: string;
  color?: string;
  textColor?: string;
  font?: 'sans' | 'serif' | 'mono' | 'round';
}

export interface LogoOptions {
  /** A data URI or URL for the logo image placed in the center. */
  data: string;
  w?: number;
  h?: number;
  size?: number;
  backdrop?: 'none' | 'square' | 'rounded' | 'circle';
  pad?: number;
  excavate?: boolean;
}

export interface Options {
  type?: ContentType;
  preset?: string;
  /** Output width in pixels. Omit for a viewBox-only, scalable SVG. */
  size?: number;
  dot?: DotStyle;
  eyeFrame?: EyeFrameStyle;
  eyePupil?: EyePupilStyle;
  color?: ColorOptions;
  eye?: EyeOptions;
  background?: BackgroundOptions;
  frame?: FrameOptions;
  ec?: ErrorCorrection;
  margin?: number;
  logo?: LogoOptions;
}

export type Content =
  | string
  | { type: 'url'; url?: string; data?: string }
  | { type: 'text'; text?: string; data?: string }
  | { type: 'phone'; phone?: string; data?: string }
  | { type: 'wifi'; ssid?: string; pass?: string; enc?: 'WPA' | 'WEP' | 'nopass'; hidden?: boolean }
  | { type: 'email'; to?: string; subject?: string; body?: string }
  | { type: 'sms'; to?: string; msg?: string }
  | { type: 'vcard'; first?: string; last?: string; org?: string; title?: string; phone?: string; email?: string; url?: string };

export interface Assessment {
  level: 'good' | 'fair' | 'poor';
  reasons: string[];
}

export interface PresetInfo {
  id: string;
  name: string;
}

/** Generate a QR code as an SVG string. */
export function toSVG(content: Content, opts?: Options): string;

/** Assess how well the code will scan. */
export function assess(content: Content, opts?: Options): Assessment;

/** The built-in style presets (id and name). */
export const presets: PresetInfo[];
