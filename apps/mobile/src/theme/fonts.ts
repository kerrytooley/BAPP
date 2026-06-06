import { colours } from "./colours";

export const fonts = {
    family: {
        bappLogo: 'OleoScript_700Bold',
        body: 'OpenSans_400Regular',
        semiBold: 'OpenSans_600SemiBold',
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
        textTransform: "uppercase",
        color: colours.inputTitle,
        textAlign: "left"
    },
    inputText: {
        fontFamily: fonts.family.body,
        fontSize: fonts.size.md,
        fontWeight: '400',
        letterSpacing: 0,
        textAlign: 'left',
    },
    dateTimeInputText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
        fontWeight: '600',
        letterSpacing: 4,
        textAlign: "center"
    },
    unit: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
        fontWeight: '600',
    },
    buttonLabel: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
        fontWeight: '600',
        lineHeight: 18,
    },
    title: {
        fontSize: fonts.size.xl,
        lineHeight: 24,
        fontFamily: fonts.family.semiBold,
        color: colours.light,
        textAlign: "center"
    },
    subtitle: {
        fontSize: fonts.size.md,
        lineHeight: 24,
        fontFamily: fonts.family.body,
        color: colours.light,
        textAlign: "center"
    }
} as const;