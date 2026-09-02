import { colours } from '@theme/colours';
import { fonts, textStyles } from '@theme/fonts';
import { screen } from '@theme/screen';

describe('theme tokens', () => {
    it('exposes colour tokens', () => {
        expect(typeof colours.dark).toBe('string');
        expect(typeof colours.light).toBe('string');
    });

    it('exposes font families, sizes and style presets', () => {
        expect(fonts.family.body).toBeDefined();
        expect(fonts.size.md).toBeGreaterThan(0);
        expect(textStyles.title.fontFamily).toBe(fonts.family.title);
    });

    it('exposes reusable screen layouts', () => {
        expect(screen.baseScreen.backgroundColor).toBe(colours.dark);
        expect(screen.justifyScreen.justifyContent).toBe('space-between');
        expect(screen.content.width).toBe('100%');
    });
});
