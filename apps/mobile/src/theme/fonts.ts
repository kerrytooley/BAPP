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
        xxl: 48
    },
} as const;

/** Ready-to-spread text style presets */
export const textStyles = {
    bappLogo: {
        fontFamily: fonts.family.bappLogo,
        fontSize: fonts.size.lg,
        lineHeight: 24,
    },
    inputTitleText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.sm,
        letterSpacing: 0.6,
        lineHeight: 24,
        textTransform: "uppercase",
        color: colours.inputTitle,
        textAlign: "left"
    },
    inputText: {
        fontFamily: fonts.family.body,
        fontSize: fonts.size.md,
        letterSpacing: 0,
        textAlign: 'left',
    },
    dateTimeInputText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
        letterSpacing: 4,
        textAlign: "center"
    },
    countdown: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.lg,
        letterSpacing: 4,
        textAlign: "center",
        color: colours.light,
    },
    unit: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
    },
    buttonLabel: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.md,
    },
    title: {
        fontSize: fonts.size.xl,
        lineHeight: 36,
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
    },
    placeholderText: {
        fontFamily: fonts.family.body,
        fontSize: fonts.size.md,
        letterSpacing: 0,
        textAlign: 'left',
        color: colours.placeholderText
    }
} as const;