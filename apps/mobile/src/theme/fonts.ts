export const fonts = {
    family: {
        bappLogo: 'OleoScript_700Bold',
        body: 'OpenSans-Regular',
        semiBold: 'OpenSans-SemiBold',
        inter: 'Inter-Regular',
    },
    size: {
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
    },
} as const;

/** Ready-to-spread text style presets */
export const textStyles = {
    bappLogo: {
        fontFamily: fonts.family.bappLogo,
        fontSize: fonts.size.lg,
        fontWeight: '700',
        lineHeight: 24,
    },
    inputTitleText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        letterSpacing: 0.6,
        lineHeight: 24,
    },
    inputText: {
        fontFamily: fonts.family.body,
        fontSize: fonts.size.md,
    },
    unit: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
        fontWeight: '600',
    },
    buttonLabel: {
        fontFamily: fonts.family.inter,
        fontSize: fonts.size.md,
        fontWeight: '700',
        lineHeight: 18,
    },
} as const;