import { useColorScheme } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * Returns the color palette for the current system color scheme.
 * Screens should use `colors.*` for all color values so dark mode
 * is handled automatically.
 *
 * @returns {{ colors: typeof COLORS.light, isDark: boolean }}
 */
export function useTheme() {
	const scheme = useColorScheme();
	const isDark = scheme === 'dark';
	return {
		colors: isDark ? COLORS.dark : COLORS.light,
		isDark,
	};
}
