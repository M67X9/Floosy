export type Theme = {
  bg: string; surface: string; surface2: string; ink: string; muted: string; line: string;
  brand: string; brandInk: string; brandText: string; hero: string; heroInk: string; heroMuted: string;
  lime: string; up: string; down: string; warn: string; danger: string; overlay: string; flash: string;
  dark: boolean;
};

export const light: Theme = { bg: '#F2F4F0', surface: '#FFFFFF', surface2: '#EDF0EB', ink: '#0E1D19', muted: '#56665F', line: '#E0E6DF', brand: '#0B5D4B', brandInk: '#FFFFFF', brandText: '#0B5D4B', hero: '#0C3B31', heroInk: '#F1F7EE', heroMuted: '#A9C5BA', lime: '#C9F26B', up: '#B8460B', down: '#0B7A5C', warn: '#9A5B00', danger: '#C2410C', overlay: 'rgba(8,20,16,.45)', flash: 'rgba(201,242,107,.45)', dark: false };
export const dark: Theme = { bg: '#0A1210', surface: '#121C19', surface2: '#1A2622', ink: '#E9F0EC', muted: '#98A9A2', line: '#24332E', brand: '#C9F26B', brandInk: '#0B1F18', brandText: '#C9F26B', hero: '#143D33', heroInk: '#F1F7EE', heroMuted: '#A3C2B6', lime: '#C9F26B', up: '#FB923C', down: '#5EE3A9', warn: '#FBBF24', danger: '#C2410C', overlay: 'rgba(0,0,0,.6)', flash: 'rgba(201,242,107,.18)', dark: true };

// Soft tint behind a category icon.
export const soft = (color: string, isDark: boolean) => color + (isDark ? '33' : '1F');
